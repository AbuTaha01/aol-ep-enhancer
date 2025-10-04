class StateManager {
    static globalVCodeText = null;
    static dataTable = null;

    static setVCodeText(text) {
        this.globalVCodeText = text;
    }

    static getVCodeText() {
        return this.globalVCodeText;
    }

    static setDataTable(table) {
        this.dataTable = table;
    }

    static getDataTable() {
        return this.dataTable;
    }
}

window.StateManager = StateManager;