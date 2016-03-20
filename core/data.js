const Redis    = require('ioredis');
const fs       = require('fs');
const path     = require('path');
const low      = require('lowdb');
const storage  = require('lowdb/file-sync');
const jsonfile = require('jsonfile');

const helpers  = require('./helpers');

const db = low('db.json', { storage });

module.exports = {
  redis: new Redis(),
  db: db,

  fallbackTheme: 'default',

  getThemePath: function(path) {
    if (helpers.pathExists(global.appRoot+'/themes/'+db.object.config.theme+'/'+path)) {
      return global.appRoot+'/themes/'+db.object.config.theme+'/'+path;
    }
    if (helpers.pathExists(global.appRoot+'/themes/'+this.fallbackTheme+'/'+path)) {
      return global.appRoot+'/themes/'+this.fallbackTheme+'/'+path;
    }
    if (!helpers.pathExists(global.kapowRoot+'/themes/'+db.object.config.theme+'/'+path)) {
      return global.kapowRoot+'/themes/'+this.fallbackTheme+'/'+path;
    }
    return global.kapowRoot+'/themes/'+db.object.config.theme+'/'+path;
  },

  getTemplate: function(template) {
    var template = this.getThemePath('templates/'+template+'.jade');

    if (helpers.pathExists(template)) {
      return template;
    }

    // Find backup template
    var templates = this.getTemplates();
    return this.getThemePath('templates/'+templates[0]+'.jade');
  },

  getTemplateInfoPath: function(template) {
    var templateInfo = this.getThemePath('templates/'+template+'.json');
    var template = this.getThemePath('templates/'+template+'.jade');

    if (helpers.pathExists(templateInfo) || helpers.pathExists(template)) {
      return templateInfo;
    }

    // Find backup template info
    var templates = this.getTemplates();
    return this.getThemePath('templates/'+templates[0]+'.json');
  },

  getTemplates: function() {
    var _this = this;
    return fs.readdirSync(this.getThemePath('templates'))
      .filter(function(file) {
        var ext = file.split('.').pop();
        return fs.statSync(path.join(_this.getThemePath('templates'), file)).isFile() && file[0] !== '_' && ext === 'jade';
      })
      .map(function(file) {
        return file.substr(0, file.length-'.jade'.length);
      });
  },

  getThemes: function() {
    var appThemes = fs.readdirSync(global.appRoot+'/themes')
      .filter(function(file) {
        return fs.statSync(path.resolve(global.appRoot+'/themes', file)).isDirectory();
      });

    var kapowThemes = fs.readdirSync(global.kapowRoot+'/themes')
      .filter(function(file) {
        return fs.statSync(path.resolve(global.kapowRoot+'/themes', file)).isDirectory();
      });

    return appThemes.concat(kapowThemes);
  },

  getTemplateInfo: function(template) {
    var path = this.getTemplateInfoPath(template);
    if (helpers.pathExists(path)) {
      return jsonfile.readFileSync(path);
    }
    return {
      name: template.charAt(0).toUpperCase() + template.slice(1),
      fields: [],
      exclude: []
    }
  },

  getTemplateName: function(template) {
    return this.getTemplateInfo(template).name || '';
  },

  getTemplateFields: function(template) {
    return this.getTemplateInfo(template).fields || [];
  },

  getTemplateExclude: function(template) {
    return this.getTemplateInfo(template).exclude || [];
  },

  getAdminPath: function(path) {
    return global.kapowRoot+'/admin/'+path;
  }
};
