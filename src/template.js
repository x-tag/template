(function(){

  var templates = {};
  var templateMaps = {};

  function createScript(element){
    var script = document.createElement('script');
        script.type = 'template';
    element.appendChild(script);
    return script;
  }

  function switchTemplate(event){
    var previous = templates[event.target.xtag.__previousTemplate__];
    if (previous) previous.detachTemplate(event.templateTarget);
    var template = templates[event.template];
    if (template) template.attachTemplate(event.target);
  }

  function getScriptElement(){
    return this.querySelector('script[type="template"]') || createScript(this);
  }

  function projectPropertyBindings(template, element, frag){
    var bindings = this.xtag.bindings,
        map = templateMaps[this.name] ? templateMaps[this.name][element.nodeName.toLowerCase()] : null;
    for (var key in bindings){
      var prop = map && map[key] ? map[key] : null,
          value = getElementValue(element, prop, key);
      bindings[key].call(frag, value, element);
    }
  }

  function setBinding(key, fn, element, frag, mappings){
    var mapping = mappings && mappings[key] ? mappings[key] : null;
    var value = getElementValue(element, mapping, key);
    fn.call(element, frag, value);
  }

  function getElementValue(element, mapping, key){
    var value;
    if (typeof mapping == 'string'){
      value = element[mapping];
    }
    else if (mapping){
      value = mapping.action ? mapping.action.call(null, element, element[mapping.key]) : element[mapping.key];
    }
    else value = element[key];
    return value;
  }

  function getMappings(name, element){
      return templateMaps[name] ? templateMaps[name][element.nodeName.toLowerCase()] : null;
  }

  xtag.pseudos.templateTarget = {
    action: function(pseudo, event){
      event.templateTarget = this;
    }
  };

  xtag.pseudos.select = {
    action: function(pseudo){
      var fn = pseudo.listener;
      pseudo.listener = function(value, element){
        var args = arguments;
        xtag.query(this, pseudo.value).forEach(function(match){
          fn.call(match, value, element);
        });
      }
    }
  }

  window.addEventListener('templatechange', switchTemplate, false);

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
        var template = this;
        var content = this.querySelector('template').content;
        console.log('calling render')
        xtag.toArray(elements ? (elements.xtag ? [elements] : elements) :
          window.document.querySelectorAll('[template="' + this.name + '"]')).forEach(function(element){
            if (element.xtag) {
              element.xtag.template = template;
              var frag = content.cloneNode(true);
              projectPropertyBindings(template, element, frag);
              element.innerHTML = '';
              element.appendChild(frag);
            }
        });
      },
      addTemplateListeners: function(events){
        for (var key in events) {
          var split = key.split(':');
              split.splice(1, 0, 'delegate([template="'+ this.name +'"]):templateTarget');
          var join = split.join(':');
          this.xtag.templateListeners[join] = this.xtag.templateListeners[join] || [];
          this.xtag.templateListeners[join].push(xtag.addEvent(window.document, join, events[key]));
        }
      },
      addBindings: function(obj){
        var bindings = this.xtag.bindings;
        for (var key in obj) {
          bindings[key.split(':')[0]] = xtag.applyPseudos(key, obj[key]);
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
          var prop = mappings[key].key || mappings[key];
          element[prop] = value;
        }
        else element[key] = value;
      },
      updateBindingValue: function(element, key, value){
        var mappings = getMappings(this.name, element);
        var bindings = this.xtag.bindings;
        if (bindings[key]){
          bindings[key].call(element, value, element);
        }
        if (mappings) for (var item in mappings){
          if (typeof mappings[item] == 'string' && mappings[item] == key || mappings[item].key == key){
            bindings[item].call(element, value, element);
          }
        }
      }
    }

  });

  XTemplate.mapProperties = function(name, elementName, map){
    if (!templateMaps[name]) templateMaps[name] = {};
    templateMaps[name][elementName] = map;
    var template = templates[name];
    if (template){
      xtag.query(window.document, elementName + '[template="' + name +'"]').forEach(function(element){
        projectPropertyBindings(template, element, element);
      });
    }
  }


})();
