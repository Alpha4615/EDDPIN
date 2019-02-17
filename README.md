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
* **channelModeChange** - A mode change has been applied to a channel
* **channelUserStatusChange** - A user has been given (or lost a status) 
* **endOfBurst** - End of a new-server burst
* **kick** - A user has been kicked from a channel
* **messageUser** - A message has been sent to a pseudoUser managed by EDDPIN
* **messageChannel** - A message has been sent to a channel that is occupied by a pseudoUser managed by EDDPIN
* **uplinkConnected** - A successful connection has been made to the uplink
* **uplinkDisconnected** - This event is called immediately before EDDPIN terminates after the uplink is disconnected
* **userModeChange** - A user has had a mode change applied
* **operUp** - a user has opered up
* **quit** - A user has disconnected from the network

### Event Object
An instance of eventObject is passed with every event trigger. This contains information about the event which is represented by the following properties:

* **actor** - An instantiation of the *user* class that represents the user who initiated the event
* **victim** - On events where a user is affected by the action, this is an instantiation of the *user* class that represents the user that was the target of the event
* **channel** - If the event occurred on a channel, this is an instantiation of the *channel* class that represents the channel
* **originatingServer** - An instantiation of the *server* class
* **data** - This is additional data about the event. The keys stored in this vary from event to event.