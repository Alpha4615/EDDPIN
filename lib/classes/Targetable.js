class Targetable {
	#_targetString = '';
	#_type = '';
	#_core;

	constructor(targetString, type, core) {
		this.#_targetString = targetString;
		this.#_type = type;
		this.#_core = core; 
	}

	get targetString() { return this.#_targetString };
	get type() { return this.#_type }

}

module.exports = Targetable;