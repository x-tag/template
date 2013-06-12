(function(){

  var templates = {};
  var templateMappings = {};

  function createScript(element, type){
    var script = document.createElement('script');
    script.type = 'template';
    element.appendChild(script);
    return script;
  }

  function switchTemplate(event){
    var previous = templates[event.target.xtag.__previousTemplate__];
    if (previous) previous.detachTemplate(event.templateTarget);
    this.attachTemplate(event.target);
  }

  function getScriptElement(){
    return this.querySelector('script[type="template"]') || createScript(this, 'script');
  }

  function projectPropertyBindings(element, frag){
    var mappings = templateMappings[this.name] ?
        templateMappings[this.name][element.nodeName.toLowerCase()] : null,
      bindings = this.xtag.bindings;
    for (var key in bindings){
      var mapping = mappings && mappings[key] ? mappings[key] : null,
        value = getElementValue(element, mapping, key);
      bindings[key].call(element, frag, value);
    }
  }

  function setBinding(key, bindingfn, element, frag, mappings){
    var mapping = mappings && mappings[key] ? mappings[key] : null;
    var value = getElementValue(element, mapping, key);
    bindingfn.call(element, frag, value);
  }

  function getElementValue(element, mapping, key){
    var value;
    if (typeof mapping == 'string'){
      value = element[mapping];
    } else if (mapping){
      value = mapping.action ? mapping.action.call(null, element, element[mapping.key]) : element[mapping.key];
    } else {
      value = element[key];
    }
    return value;
  }

  function getMappings(name, element){
      return templateMappings[name] ? templateMappings[name][element.nodeName.toLowerCase()] : null;
  }

  xtag.pseudos.templateTarget = {
    action: function(pseudo, e, args){
      e.templateTarget = this;
    }
  };

  xtag.pseudos.select = {
    action: function(pseudo, e, args){
      var self = this;
      var fn = pseudo.listener;
      return pseudo.listener = function(){
        xtag.query(e, pseudo.value).forEach(function(match){
          fn.call(self, match, args);
        });
      }
    }
  }

  window.addEventListener('templatechange', function(event){
    var template = templates[event.template];
    if (template) switchTemplate.call(template, event);
  }, false);

XTemplate = xtag.register('x-template', {
    lifecycle: {
      created: function(){
        this.xtag.bindings = {}, this.xtag.templateListeners = {}, this.xtag.attached = [];
        var templateName = this.getAttribute('name');
        templates[templateName] = this;
        this.script = this.script;
      },
      attributeChanged: function(name, newValue, oldValue){
        if (name == 'name') {
          templates[newValue] = templates[oldValue];
          // run detach template
          delete templates[oldValue];
        }
      }
    },
    accessors: {
      name: {
        attribute: {},
        set: function(value){
          console.log('name is set');
          //this.render();
        }
      },
      script: {
        get: function(){
          return getScriptElement.call(this).textContent;
        },
        set: function(script){
          this._dumpTemplateEvents();
          getScriptElement.call(this).textContent = String(script);
          this.xtag.templateScript = (typeof script == 'function' ? script : new Function(script)).bind(this);
          this.xtag.templateScript();
        }
      }
    },
    methods:{
      render: function(elements){
        var self = this;
        var template = this.querySelector('template').content;
        console.log('calling render')
        xtag.toArray(elements ? (elements.xtag ? [elements] : elements) :
          window.document.querySelectorAll('[template="' + this.name + '"]')).forEach(function(element){
            if (element.xtag) {
              element.xtag.template = self;
              var frag = template.cloneNode(true);
              projectPropertyBindings.call(self, element, frag);
              element.innerHTML = '';
              element.appendChild(frag);
            }
        });
      },
      addTemplateListeners: function(events){
        for (var type in events) {
          var split = type.split(':');
            split.splice(1, 0, 'delegate([template="'+ this.name +'"]):templateTarget'),
            fn = events[type];
          type = split.join(':');
          this.xtag.templateListeners[type] = this.xtag.templateListeners[type] || [];
          this.xtag.templateListeners[type].push(xtag.addEvent(window.document, type, fn));
        }
      },
      addBindings: function(bindings){
        var store = this.xtag.bindings;
        for (var key in bindings) {
          var name = key.split(':')[0];
          store[name] = xtag.applyPseudos(key, bindings[key]);
        }
      },
      attachTemplate: function(element){
        var attached = this.xtag.attached;
        if (attached.indexOf(element) == -1) attached.push(element);
        console.log('attach template');
        this.render(element);
      },
      detachTemplate: function(element){
        var attached = this.xtag.attached,
          index = attached.indexOf(element);
        if (index != -1) attached.splice(index, 1);
      },
      removeTemplateListener: function(type, fn){
        xtag.removeEvent(window.document, type, fn);
      },
      _dumpTemplateEvents: function(){
        for (var z in this.xtag.templateListeners) this.xtag.templateListeners[z].forEach(function(fn){
          xtag.removeEvent(window.document, z, fn);
        });
      },
      updateProperties: function(element, properties){
        for (var prop in properties){
          this.updateProperty(element, prop, properties[prop]);
        }
      },
      updateProperty: function(element, key, value){
        var mappings = getMappings(this.name, element);
        if (mappings && mappings[key]){
          var key = typeof mappings[key] == 'string' ? mappings[key] : mappings[key].key;
          element[key] = value;
        } else {
          element[key] = value;
        }
      },
      updateBindingValue: function(element, key, value){
        var mappings = getMappings(this.name, element);
        var bindings = this.xtag.bindings;
        if (bindings[key]){
          bindings[key].call(null, element, value);
        }
        if (mappings) for (var item in mappings){
          if (typeof mappings[item] == 'string' && mappings[item] == key || mappings[item].key == key){
            bindings[item].call(null, element, value);
          }
        }
      }
    }

  });

  XTemplate.mapProperties = function(name, elementName, map){
    if (!templateMappings[name]) templateMappings[name] = {};
    templateMappings[name][elementName] = map;
    var template = templates[name];
    if (template){
      xtag.query(window.document, elementName + '[template="' + name +'"]').forEach(function(element){
        projectPropertyBindings.call(template, element, element);
      });
    }
  }


})();
