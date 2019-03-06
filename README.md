EDDPIN
======

EDDPIN stands for for Event-Driven Development Platform for IRC Network and is currently compatible only with networks operating on the [P10 protocol](http://wiki.darenet.org/P10_Protocol).


This application enables IRC network administrators to deploy modules that respond events that occur on the network as well as create pseudo-users (bots) that can interact with their users.

Without modules installed, EDDPIN will not do anything useful. It will monitor the network for events and trigger events that are not being listened to.

## Installation
To install EDDPIN:

* Open config.sample.json and change the values to what is appropriate for your use.
* In console, CD into the root directory of the package and type 'npm install' this will install any dependencies from node package manager.
* Run the application by typing 'node server.js'

## Dependencies
This package requires nodeJS, Node Package Manager, and [colors.js](https://www.npmjs.com/package/colors).

## Modules

It is simple to write a module. Check out modules/testModule/testModule.js to examine the syntax expected.

Your module must follow that same naming convention: modules/**[MODULENAME]**/**[MODULENAME]**.js

### onLoad()

Any code in the onLoad() method of your function will be executed as soon as the module is loaded. You can do initialization of your module here as well as binding events through manual invocation.

### Binding to events
There are several ways to bind to an event from within a module.

#### Callback Function
The callback function attached to each binding must contain a single argument for the event object.

The following code example would respond to a user kicking a pseudouser by rejoining the channel and kicking the user back, but only if the kicker is not an IRCop

```javascript
yourModule.prototype.onKick = function (eventObj) {
    if (this.isMyUser(eventObj.victim) && !eventObj.actor.isOper()) {
        eventObj.victim.join(event.channel);
        eventObj.victim.privmsg(eventObj.channel, "Yeah, don't think so!");
        eventObj.kick(eventObj.channel, eventObj.actor, "Do not kick me!");
    }
};
```

#### Lazy Bindings
The simplest way to bind is a "lazy binding." This creates a simple bind in the module when its created without setting any options to it. This is done by adding an item to the events property in your module, where the key is the event name and the value is a callback to the function you want called when the event occurs.

For example:
 ```javascript
        testModule.prototype.events = {
            'kick': 'onKick',
            'channelJoin': 'onJoin',
            'newUser': 'onNewUser',
            'channelPart': 'onPart'`
          };
```

### Binding through invocation
In your code, say in the onLoad() method, you can create new bindings, using different methods:

* **subscribeToEvent(*eventName*, *callBack*, *options*)** - Your module have the specified callback in the context of the module when the specified event is called
* **subscribeToEvent_selfish(*eventName*, *callBack*, *options*)** -- A shortcut to having selfish:true in the options block for above.

#### Options
The options for a binding currently supports:
* **selfish** (*boolean*): If set to true, the call back will only be called if the event's victim is a user managed by this module or if the event occurs on a channel occupied by the same. (DEFAULT: false)
* **pretest** (*function*): If set, this function is called and must return true for the callback to be executed

#### Example

The following code would respond to an IRCop joining a channel that is occupied by a user created by the current module.
```javascript
yourModule.prototype.onLoad = function () {
    var options = {
        selfish: true,
        pretest: function (event) {
            if (event.actor.isOper()) {
                return true;
            }
        }
    };
    
    var callback = function (eventObj) {
                           eventObj.victim.privmsg(eventObj.channel, "Hey everyone! " + eventObj.actor.nickname " is an IRCop.");
    };
                   
    this.subscribeToEvent("channelJoin", callback, options);
};
```


### Bindable Events
The following events are a sample of what's available for binding:

* **accountAuth** - A user authenticates to an account
* **channelBurst** - A channel is being bursted by a server
* **channelCreate** - A channel is being created by a user
* **channelDestroyed** - A channel has been emptied
* **channelJoin** - A channel is being joined by a user
* **channelPart** - A channel is being parted by a user
* **channelModeChange** - A mode change has been applied to a channel
* **channelUserStatusChange** - A user has been given (or lost a status) 
* **ctcpChannel_user** - A CTCP request from a user has been received targeted at a channel
* **ctcpChannel_server** - See above, except the source is a server.
* **ctcpUser_user** - A CTCP request from a user has been received targeted at a pseudo user
* **ctcpUser_server** - See above, except the source is a server.
* **ctcpReply** - A CTCP reply has been received.
* **endOfBurst** - End of a new-server burst
* **ipNowHIdden** - A user has had +x applied to their user mode
* **ircAdminApplied** - A user has had +a applied to their user mode
* **kick** - A user has been kicked from a channel
* **message_user** - A message from a non-server is sent to any target (channel/pseudo user)
* **message_server** - See above, except the source is a server.
* **messageUser_user** - A message from a non-server has been sent to a pseudoUser managed by EDDPIN
* **messageUser_server** - See above, except the source is a server.
* **messageChannel_user** - A message has been sent to a channel that is occupied by a pseudoUser managed by EDDPIN
* **messageChannel_server** - See above, except the source is a server.
* **notice_user** - A notice from a non-server is sent to any target (channel/pseudo user)
* **noticee_server** - See above, except the source is a server.
* **noticeUser_user** - A notice from a non-server has been sent to a pseudoUser managed by EDDPIN
* **noticeUser_server** - See above, except the source is a server.
* **noticeChannel_user** - A notice has been sent to a channel that is occupied by a pseudoUser managed by EDDPIN
* **noticeChannel_server** - See above, except the source is a server.
* **uplinkConnected** - A successful connection has been made to the uplink
* **uplinkDisconnected** - This event is called immediately before EDDPIN terminates after the uplink is disconnected
* **userKilled** - A user has been killed from the server
* **userModeChange** - A user has had a mode change applied
* **userNicknameChange** - A user has changed their nickname
* **operPrivilegeAssigned** - One or more PRIVs have been assigned to a user
* **operUp** - a user has opered up
* **ping** - A ping has been received from the uplink
* **serverQuit** - A server has left the network
* **SVSJoin** - A user has been forcefully joined to a channel.
* **SVSNick** - A user has had a new nickname forced onto them.
* **SVSPart** - A user has been forcefully parted from a channel.
* **topicSet** - A topic has been set in a channel
* **quit** - A user has disconnected from the network

#### Message Visibility
Please note that due to how P10 protocol is designed, An EDDPIN instance will only see notices and messages targeted directly at a pseudo-user or at a channel that contains a pseudo-user. It impossible to monitor message traffic between regular users and inside channels that do not have a pseudo-user present.

Certain mods and patches for your P10 server could change this behavior.

### Event Object
An instance of eventObject is passed with every event trigger. This contains information about the event which is represented by the following properties:

* **actor** - An instantiation of the *user* class that represents the user who initiated the event
* **victim** - On events where a user is affected by the action, this is an instantiation of the *user* class that represents the user that was the target of the event
* **channel** - If the event occurred on a channel, this is an instantiation of the *channel* class that represents the channel
* **originatingServer** - An instantiation of the *server* class
* **data** - This is additional data about the event. The keys stored in this vary from event to event.