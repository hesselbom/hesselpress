const Redis   = require('ioredis');
const low     = require('lowdb');
const storage = require('lowdb/file-sync');

const helpers = require('./helpers');

const db = low('db.json', { storage });

module.exports = {
  redis: new Redis(),
  db: db,

  theme: db.object.config.theme,
  fallbackTheme: 'default',

  getThemePath: function(path) {
    if (!helpers.pathExists(global.appRoot+'/themes/'+this.theme+'/'+path)) {
      return global.appRoot+'/themes/'+this.fallbackTheme+'/'+path;
    }
    return global.appRoot+'/themes/'+this.theme+'/'+path;
  }
};
