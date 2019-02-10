var moduleObj = function(core) {
    this.core = core;
};
moduleObj.prototype.events = {};
moduleObj.prototype.myUsers = [];
moduleObj.prototype.biography = {
    title: 'Untitled Module',
    description: 'An enigmatic module',
    author: 'Anonymous',
    version: '1.0'
};

module.exports = moduleObj;