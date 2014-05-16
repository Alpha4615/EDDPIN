function resolveChannelModes(modeList) {
    var userModeFlags = ['o', 'v'];
//<- ABAAK M #vico +mvv ABAAM ABAAL 1399900275
    var split = modeList.split('');
    var newChannelModes = '';
    var newUserModes = '';



    var x;
    var cursor;
    var currentOp = '+';

    for (x = 0; x < split.length; x++) {
        // we need to determine if this is a mode that affects users or just the channel
        cursor = split[x];
        currentOp = (cursor === '+' || cursor === '-' ? cursor : currentOp);

        if (userModeFlags.indexOf(cursor) === -1) { // this mode is a mode that affects a user, we'll handle this later, for now filter it
            newUserModes += currentOp+cursor; // we're prefixing it with the current op so we know later if it's being added or removed.
        }
    }


}