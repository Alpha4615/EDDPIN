"use strict";

const Targetable = require('./Targetable.js');

class Channel extends Targetable {
	#_modes = '';
	#_name = '';
	/**
	 * The unix timestamp of the channel when it was first recognized by the server.
	 */
	#_creationTime;
	#_modeParams = [];
	#_topic = '';
	#_bans = [];
	#_ban_exceptions = [];
	#_users = {};

	constructor (name, creationTime, core) {
		super(name, "channel", core);
		this.#_name = name;
		this.#_creationTime = parseInt(creationTime);
	}


	/**
	 * Tests if a string matches and IRC-friendly address mask 
	 * @param {String} maskTest The non-mask string being tested
	 * @param {String} maskSource The wildcard-friendly string being tested against
	 * @returns Boolean
	 */
	static maskMatches(maskTest, maskSource) {
		if (maskSource.length == 0) {
			// I am unsure why, but sometimes a zero-length string can get inserted into ban lists.
			// Putting a zero-length string in the regex factory generates a weird pattern.
	
			return false;
		}
		var pattern = new RegExp(maskSource.replace(/\?/, "[0-9]+").replace(/\*/, "(.*)"), 'ig');
		return !!maskTest.match(pattern);
	}


	/**
	 * Adds a ban mask to the internal tracking
	 * @param mask
	 * @see banRemove
	 * @see banExists
	 */
	banAdd (mask) {
		if (mask.length > 0)
			this.#_bans.push(mask.toLowerCase());

		return this;
	};

	/**
	 * Tests if the channel has a specific mask banned
	 * @param {String} mask
	 * @returns {boolean}
	 * @see banAdd
	 * @see banRemove
	 */
	banExists (mask) { return !!this.#_bans.find(b => b === String(mask).toLowerCase()) };

	/**
	 * Removes a ban mask from the internal tracking
	 * @param {String} mask
	 * @see banAdd
	 * @see banExists
	 */
	banRemove (mask) {
		this.#_bans = this.#_bans.filter(banSearch => mask.toLowerCase() !== banSearch);
		return this;
	};

	/**
	 * Gets an array of bans that match the mask specified
	 * @param {String} mask
	 * @returns {Array.<string>}
	 * @see maskMatches
	 */
	getMatchingBans (mask) {
		let context = Channel;
		return this.#_bans.filter(banSearch => context.maskMatches(mask, banSearch));
	};

	/**
	 * Tests if a mask is banned
	 * @param {String} mask
	 * @returns Boolean
	 * @see getMatchingBans
	 */
	isMaskBanned (mask) {
		return (this.getMatchingBans(mask).length > 0);
	};

	/**
	 * Checks to see if a user is banned based off their mask
	 * @param {User} user
	 * @throws TypeError
	 * @returns Boolean
	 */
	isUserBanned (user) {
		if (!core.isType_user(user)) {
			throw new TypeError("Valid user instance expected");
		}
		return this.isMaskBanned(user.mask);
	};

	/**
	 * Gets an array of exceptions that match the mask specified
	 * @param {String} mask
	 * @returns {Array.<string>}
	 * @see maskMatches
	 */
	getMatchingExceptions (mask) {
		var context = this;
		return this.#_ban_exceptions.filter(exceptionSearch => context.maskMatches(mask, exceptionSearch));
	};

	/**
	 * Tests if a mask marked as an exception
	 * @param {String} mask
	 * @returns Boolean
	 * @see getMatchingExceptions
	 */
	isMaskExcepted (mask) {
		return (this.getMatchingExceptions(mask).length > 0);
	};

	/**
	 * Checks to see if a user is an exception based off their mask
	 * @param {User} user
	 * @throws TypeError
	 * @returns Boolean
	 */
	isUserExcepted (user) {
		if (!core.isType_user(user)) {
			throw new TypeError("Valid user instance expected.");
		}

		return (this.isMaskExcepted(user.getMask()));
	};

	/**
	 * Determines if a user can join the channel based on the ban and exception list
	 *
	 * If the user is not banned or if they are banned but match an exception, this returns true.
	 * @param {User} user
	 * @throws TypeError
	 * @returns {boolean}
	 */
	isJoinableBy (user) {
		if (!core.isType_user(user)) {
			throw new TypeError("Valid user instance expected.");
		}
		return (!this.isUserBanned(user) || (this.isUserBanned(user) && this.isUserExcepted(user)));
	};

	/**
	 * Adds an exception mask to the internal tracking
	 * @param {String} mask
	 * @see banExceptionExists
	 * @see banExceptionRemove
	 */
	banExceptionAdd (mask) { 
		this.#_ban_exceptions.push(mask.toLowerCase());
		
		return this;
	};

	/**
	 * Tests if the channel has a specific mask in its exception list
	 * @param {String} mask
	 * @returns Boolean
	 * @see banExceptionAdd
	 * @see banExceptionRemove
	 */
	banExceptionExists (mask) {
		return this.#_ban_exceptions.some(exception => {
			if (mask.toLowerCase() === exception) {
				return true;
			}
		});
	};

	/**
	 * Removes a exception mask from the internal tracking
	 * @param {String} mask
	 * @see banExceptionAdd
	 * @see banExceptionExists
	 * @returns {this}
	 */
	banExceptionRemove (mask) {
		this.#_ban_exceptions = this.#_ban_exceptions.filter(banSearch => mask.toLowerCase() !== banSearch);
		
		return this;
	};

	
	/**
	 * Tests if a user has a certain mode on the channel
	 * @param {User} user
	 * @param {string} modeQuery
	 * @returns Boolean
	 * @throws TypeError
	 * @see userIsOp
	 * @see userIsHalfOp
	 * @see userIsVoice
	 */
	userHasMode (user, modeQuery) {
		if (!core.isType_user(user)) {
			throw new TypeError("Valid user instance expected.");
		}
		if (this.hasUser(user) === false) {
			return false;
		}
		var foundUser = this.#_users[user.numeric];
		var splitModes = foundUser.mode.split('');
		return (splitModes.indexOf(modeQuery) !== -1);
	};

	/**
	 * Tests if a user is op on the channel
	 * @param user {user}
	 * @returns {boolean}
	 * @see userHasMode
	 */
	userIsOp (user) { return this.userHasMode(user, 'o'); };
	/**
	 * Checks to see if a user is half-op on the channel
	 * @param user {user}
	 * @returns {boolean}
	 * @see userHasMode
	 */
	userIsHalfOp (user) { return this.userHasMode(user, 'h'); }

	/**
	 * Checks to see if the user is a voice on the channel
	 * @param user {user}
	 * @returns {boolean}
	 * @see userHasMode
	 */
	userIsVoice (user) { return this.userHasMode(user, 'v'); };

	/**
	 * Internally registers a user as a member of the channel
	 * @param {User} user Targeted user
	 * @param {String} modes The channel-modes that was applied to the user
	 */
	userJoin (user, modes) {
		if (!core.isType_user(user)) {
			throw new TypeError("Valid user instance expected.");
		}
		modes = (modes === undefined ? '' : modes);

		this.#_users[user.numeric] = {'user': user, 'mode': modes};
		user.channels[this.nameSafe] = {channel: this, mode: modes};
	};

	/**
	 * Internally deregisters a user as a member of the channel
	 * @throws TypeError
	 * @param {User} user
	 */

	userPart (user) {
		if (!core.isType_user(user)) {
			throw new TypeError("Valid user instance expected.");
		}
		delete this.#_users[user.numeric];
		delete user.channels[this.nameSafe];

		if (this.membershipCount === 0 && !this.isPersisted) {
			core.destroyChannel(this);
		}
	};

	/**
	 * Tests if a user with a specified numeric is a member of the channel
	 * @param numeric {String}
	 * @returns {boolean}
	 */
	hasUserNumeric (numeric) {
		return (this.#_users[numeric] !== undefined);
	};

	/**
	 * Tests if a user object is a member of the channel
	 * @param {User} user
	 * @returns {boolean}
	 */
	hasUser (user) {
		if (!core.isType_user(user)) {
			throw new TypeError("Valid user instance expected.");
		}
		for (var key in this.#_users) {
			if (key === user.numeric) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Checks if a user is on the channel
	 * @param {User|String} user The user being sought. If it's a string, it will be assumed to be the nickname of the user;
	 * @returns {boolean}
	 */
	has (user) {
		let targetUser = core.isType_user(user) ? user : core.getUserByNickname(String(user));
		
		return targetUser ? !!this.#_users[targetUser.numeric] : false;
	}

	/**
	 * Tests if the channel has a certain mode set
	 * @param modeQuery {String}
	 * @returns {boolean}
	 */
	hasMode (modeQuery) {
		return (this.#_modes.split('').indexOf(modeQuery) !== -1);
	};

	/**
	 * Retrieves the parameter value of a specified mode
	 *
	 * Returns false if the channel does not have this param-mode set
	 * @param modeQuery
	 * @returns {String|Boolean}
	 */
	getParameterModeValue (modeQuery) {
		if (!this.hasMode(modeQuery) || typeof this.#_modeParams[modeQuery] !== "string") {
			return false;
		}

		return this.#_modeParams[modeQuery];
	};

	setParameterModeValue (modeQuery, value) { this.#_modeParams[modeQuery] = value; };

	/*
	* Tests if the channel has mode +m
	* @returns {boolean}
	*/
	get isModerated () { return this.hasMode('m'); };

	/**
	 * Tests if the channel has mode +r
	 * @returns {boolean}
	 */
	get isRegistered () { return this.hasMode('r'); };

	/**
	 * Tests if the channel has mode +i
	 * @returns {boolean}
	 */
	get isInviteOnly () { return this.hasMode('i'); };

	/**
	 * Tests if the channel has mode +s
	 * @returns {boolean}
	 */
	get isSecret () { return this.hasMode('s'); };

	/**
	 * Tests if the channel has mode +z
	 *
	 * If true, that means channel can be empty without being destroyed.
	 * @returns {boolean}
	 */
	get isPersisted () { return this.hasMode('z'); }

	/**
	 * Tests if the channel has mode +p
	 * @returns {boolean}
	 */
	get isPrivate () { return this.hasMode('p'); };

	/**
	 * Tests if the channel has mode +n
	 * @returns {boolean}
	 */
	get isNoExternalMsg () { return this.hasMode('n'); };

	/**
	 * Tests if the channel has mode +t
	 * @returns {boolean}
	 */
	get isTopicSetByOps () { return this.hasMode('t'); };

	/**
	 * Tests if the channel has mode +k
	 * @returns {boolean}
	 */
	get isKeyed () { return this.hasMode('k') };

	/**
	 * Tests if the channel has mode +l
	 * @returns {boolean}
	 */
	get isLimited () { return this.hasMode('l'); };
	/**
	 * Tests if the channel has mode +L
	 * @returns {boolean}
	 */
	get isRedirected () { return this.hasMode('L'); };

	/**
	 * Retrieves the channel's key. If it does not have one set, false is returned
	 * @returns {String|Boolean}
	 * @see isKeyed
	 */
	get channelKey () {
		if (!this.isKeyed) {
			return false;
		}

		return this.getParameterModeValue('k');
	};
	/**
	 * Retrieves the channel's limit. If it does not have one set, false is returned
	 * @returns {String|Boolean}
	 * @see isLimited
	 */
	get ChannelLimit () {
		if (!this.isLimited) {
			return false;
		}

		var value = this.getParameterModeValue('l');

		return (value != false ? parseInt(value) : false);
	};

	/**
	 * Retrieves the channel's overflow target. If it does not have one set, false is returned
	 * @returns {String|Boolean}
	 * @see isRedirected
	 */
	get channelOverflowTarge () {
		return (this.isRedirected ? this.getParameterModeValue('L') : false);
	};


	/**
	 * The number of users in the channel
	 */
	get membershipCount () { return Object.keys(this.#_users).length };
	get bans () { return this.#_bans }

	set topic (topic) {
		this.#_topic = topic;
	}
	get topic () { return this.#_topic; }

	get name () { return this.#_name; }
	get nameSafe() { return this.#_name.toLowerCase(); }

	get users() { return this.#_users; }


	get modes () { return this.#_modes; }
	set modes(modes) { this.#_modes = modes; }

	get modeParams() {return this.#_modeParams; }
	set modeParams(modeParams) { this.#_modeParams = modeParams; }

	
};


module.exports = Channel;