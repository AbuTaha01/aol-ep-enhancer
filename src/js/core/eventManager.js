class EventManager {
    static listeners = {};

    static add(id, element, eventType, callback, options = {}) {
        this.remove(id); // Remove any existing listener with the same ID

        element.addEventListener(eventType, callback, options);
        this.listeners[id] = { element, eventType, callback, options }; // Store options too

        return callback;
    }

    static remove(id) {
        if (this.listeners[id]) {
            const { element, eventType, callback, options } = this.listeners[id];
            element.removeEventListener(eventType, callback, options); // Use stored options
            delete this.listeners[id];
        }
    }

    static removeAll() {
        Object.keys(this.listeners).forEach(id => this.remove(id));
    }

    // Initialize cleanup when the window unloads
    static init() {
        window.addEventListener('beforeunload', () => this.removeAll());
    }
}

window.EventManager = EventManager;