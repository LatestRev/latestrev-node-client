class SingleOperation {
    constructor() {
        this.pending = {};
    }

    run(key, valueFactory) {
        var operationPromise = this.pending[key];
        if (operationPromise) {
            return operationPromise;
        }

        var promise = (this.pending[key] = valueFactory().finally(() => {
            delete this.pending[key];
        }));

        return promise;
    }
}
module.exports = SingleOperation;
