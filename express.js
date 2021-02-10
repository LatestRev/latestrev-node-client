class Express {
    static createMiddleware(cmsFactory) {
        const middleware = (req, res, next) => {
            // set a cookie for live mode so subsequent requests don't need a querystring
            var cmsId = req.query.cms;
            if (cmsId === 'saved') {
                res.cookie('cms', 'saved', { path: '/' });
            }

            // check for cookie if querystring wasn't provided
            if (!cmsId && req.cookies && req.cookies.cms === 'saved') {
                cmsId = 'saved';
            }

            req._latestRevCmsId = cmsId;

            // we don't want to fetch the CMS unless necessary so expose a helper
            req.getCms = async () => {
                if (!req._latestRevCms) {
                    let manifest = null;
                    if (cmsId === 'saved') {
                        req._latestRevCms = await cmsFactory.getSaved();
                    } else if (cmsId) {
                        req._latestRevCms = await cmsFactory.getScheduled(cmsId);
                    } else {
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
