class ObserverManager {
    static observers = {};

    static create(id, target, options, callback) {
        this.disconnect(id); // Disconnect any existing observer with the same ID

        const observer = new MutationObserver(callback);
        observer.observe(target, options);
        this.observers[id] = observer;

        return observer;
    }

    static disconnect(id) {
        if (this.observers[id]) {
            this.observers[id].disconnect();
            delete this.observers[id];
        }
    }

    static disconnectAll() {
        Object.keys(this.observers).forEach(id => this.disconnect(id));
    }

    // Initialize cleanup when the window unloads
    static init() {
        window.addEventListener('beforeunload', () => this.disconnectAll());
    }
}

window.ObserverManager = ObserverManager;