const extend = require('util')._extend;

const data   = require('./data');

module.exports = {
  render: function(name, post) {
    var html = '';

    global.kapowPlugins.forEach(function(plugin) {
      if (plugin && plugin.render) {
        var settings = {};

        if (plugin.settings) {
          plugin.settings.forEach(function(field) {
            settings[field.id] = data.db.object.config[plugin.id + '--' + field.id];
          });
        }

        var rendered = plugin.render(name, post, settings);
        if (rendered) html += rendered;
      }
    });

    return html;
  },

  settings: function() {
    var settings = [];

    global.kapowPlugins.forEach(function(plugin) {
      if (plugin && plugin.settings) {
        var fields = [];

        plugin.settings.forEach(function(_field) {
          var field = extend(extend({}, _field), { id: plugin.id + '--' + _field.id });

          if (field.optionsSource) {
            switch(field.optionsSource) {
              case 'templates':
                field.options = [];

                var templates = data.getTemplates();
                templates.forEach(function(template) {
                  field.options.push({ id: template, name: data.getTemplateName(template) });
                });

                break;
              default: field.options = [{ name: "Specified options source not found", disabled: true }];
            }
          }

          fields.push(field);
        });

        settings.push({
          name: plugin.name || plugin.id,
          type: '_container',
          fields: fields
        });
      }
    });

    return settings;
  }
};
