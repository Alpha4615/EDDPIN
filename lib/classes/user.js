const Targetable = require("./Targetable.js");

/**
 * A user
 */
class User extends Targetable {

	#_nickname = '';
	#_numeric = '';
	#_GECOS = '';
	#_ident = '';
	#_host;
	#_fakehost;
	#_account;
	#_usermodes = [];
	#_usermodes_params = [];
	#_swhois = '';
	#_isPseudo = false;
	#_channels = [];
	#_privs = [];


	/**
	 * 
	 * @param {object} options 
	 * @param {EDDPIN} core 
	 */
	constructor (options, core) {
		super(options.numeric, "user", core);

		this.#_nickname = options.nickname;
		this.#_numeric = options.numeric;
		this.#_GECOS = options.GECOS;
		this.#_host = options.host;
		this.#_fakehost = options.fakehost;
		this.#_ident = options.ident;

	}


	get nickname () { return this.#_nickname }
	set nickname (nickname) { 
		this.#_nickname = String(nickname);
		this.setName(String(nickname));

		return this;
	}

	/**
	 * Determines if the user is on a specific channel
	 * @param {Channel|String} channel 
	 * @returns {boolean}
	 */

	isOn(channel) {
		let targetChannel = core.isType_channel(channel) ? channel : core.getChannelByName(String(channel))
		
		return targetChannel ? targetChannel.has(this) : false;
	};
	
	/**
	 * Determines if the user is banned on a given channel
	 * @param {Channel|string} channel
	 * @throws TypeError
	 * @returns {Boolean}
	 */

	 isBannedOn (channel) {
		let targetChannel = core.isType_channel(channel) ? channel : core.getChannelByName(String(channel));

		return targetChannel ? targetChannel.isUserBanned(this) : false;
	};

	/**
	 * Determines if the user matches an exception setting on a given channel
	 * @param channel {channel}
	 * @throws TypeError
	 * @returns {Boolean}
	 */

	isExceptedOn (channel) {
		if (!core.isType_channel(channel)) {
			throw new TypeError("Valid channel instance expected");
		}
		return channel.isUserExcepted(this);
	};

	/**
	 * Determines if a user can join a channel based off the bans and exceptions in that channel.
	 * @param channel {channel}
	 * @throws TypeError
	 * @returns {Boolean}
	 */
	canJoin (channel) {
		if (!core.isType_channel(channel)) {
			throw new TypeError("Valid channel instance expected");
		}
		return channel.isJoinableBy(this);
	}

	/**
	 * Adds a privilege to the user that has been assigned by their server (Example: when they oper up)
	 * @param privName {String}
	 * @return user
	 */
	addPriv (privName) {
		if (String(privName).length > 0) {
			this.#_privs.push(String(privName));
		}

		return this;
	};

	/**
	 * Checks to see if the user has a privilege that was assigned to them
	 * @param privName
	 * @returns {boolean}
	 * @see addPriv
	 */
	hasPriv (privName) { return !!this.#_privs.find(x=> x===privName) };

	/**
	 * Deletes a privilege (assigned by server) from the user
	 * @param privName {string}
	 * @returns {user}
	 */
	deletePriv (privName) {
		this.#_privs = this.#_privs.filter(privSearch => privSearch !== privName);

		return this;
	};

	/**
	 * Removes user from all channels
	 */
	quit () {
		for (var key in this.#_channels) {
			this.#_channels[key].channel.userPart(this);
		}
	};

	chanListArray () {
		var returnArr = [];
		for (var key in this.#_channels) {
			returnArr[returnArr.length] = key;
		}
		return returnArr;
	};

	
	/**
	 * Determines if the user has a specified mode set
	 * @param mode {string}
	 * @returns {boolean}
	 */
	hasMode (mode) {
		if (this.#_usermodes === null || typeof this.#_usermodes !== 'undefined') {
			return false;
		}

		var modeSplit = this.#_usermodes.split('');

		return (modeSplit.indexOf(mode) != -1);
	};

	/**
	 * Tests if the user possesses the 'o' user mode
	 * @returns {boolean}
	 */
	get isOper () { return this.hasMode('o'); };

	/**
	 * Tests if the user possesses the 'a' user mode
	 * @returns {boolean}
	 */
	get isIRCAdmin () { return this.hasMode('a'); };

	/**
	 * Tests if the user possesses the 'k' user mode
	 * @returns {boolean}
	 */
	get isService () { return this.hasMode('k'); };

	/**
	 * Tests if the user possesses the 'X' user mode
	 * @returns {boolean}
	 */
	get isXtraOp () { return this.hasMode('X'); };
	/**
	 * Tests if the user possesses the 'H' user mode
	 * @returns {boolean}
	 */
	get isHiddenOper () { return this.hasMode('H'); };

	/**
	 * Tests if the user possesses the 'x' user mode
	 * @returns {boolean}
	 */
	get isHostmaskCloaked () { return this.hasMode('x'); }	

	get numeric() { return this.#_numeric }

	get GECOS() { return this.#_GECOS };
	get realName() { return this.GECOS };

	get ident()  { return this.#_ident }

	get host() { return this.#_host }

	get fakehost() { return this.#_fakehost }
	set fakehost(fakehost) { this.#_fakehost = fakehost; }

	get swhois() { return this.#_swhois; }
	set swhois(swhois) { this.#_swhois = swhois; }

	get channels() { return this.#_channels; }

	set channels(channels) { this.#_channels = channels; }

	get mask() { return `${this.nickname}!${this.ident}@${this.host}`}

	get privs() { return this.#_privs };
}

module.exports = User;