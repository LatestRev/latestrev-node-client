class Express {
    static createMiddleware(cmsFactory, { allowNonPublished = true } = {}) {
        const middleware = (req, res, next) => {
            if (allowNonPublished) {
                // get id from either querystring, header, or cookie
                var cmsId = req.query.cms || req.header('RevCms-Snapshot-Id') || req.cookies?.cms;

                // set a cookie for live mode so subsequent requests don't need a querystring
                if (cmsId === 'saved' && !req.cookies?.cms) {
                    res.cookie('cms', 'saved', { path: '/' });
                }

                req._latestRevCmsId = cmsId;
            }

            // we don't want to fetch the CMS unless necessary so expose a helper
            req.getCms = async () => {
                if (!req._latestRevCms) {
                    if (allowNonPublished) {
                        if (cmsId === 'saved') {
                            req._latestRevCms = await cmsFactory.getSaved();
                        } else if (cmsId) {
                            req._latestRevCms = await cmsFactory.getScheduled(cmsId);
                        }
                    }

                    if (!req._latestRevCms) {
                        req._latestRevCms = await cmsFactory.getPublished();
                    }
                }

                return req._latestRevCms;
            };

            return next();
        };

        return middleware;
    }

    static cacheRefreshHandler(cmsFactory) {
        const handler = (req, res, next) => {
            // need to prevent caching
            res.set('Expires', -1);

            return cmsFactory
                .refreshPublished()
                .then(snapshot => res.json(snapshot.id))
                .catch(err => {
                    console.error(err);
                    res.send(500, err.message ? err.message : err);
                });
        };
        return handler;
    }
}

module.exports = Express;
