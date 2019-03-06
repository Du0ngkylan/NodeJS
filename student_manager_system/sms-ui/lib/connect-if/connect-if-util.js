let path = require('path');

const ID_SEPARATOR = '/';

const common = {
    splitIds: function(id) {
      return id.split(ID_SEPARATOR);
    },
    parseBookrackItemId(id) {
      let ids = this.splitIds(id);
      if (Array.isArray(ids) && ids.length == 2) {
        return ids[1];
      }
      return "0";
    },
    joinIds: function() {
      return Array.prototype.slice.call(arguments).join(ID_SEPARATOR);
    },
    filterProperty: function(data, acceptedField, removeIfEmpty = false) {
    if (Array.isArray(data)) {
      let newData = [];
      for (let i = 0; i < data.length; i++) {
        if (typeof data[i] === 'object') {
          data[i] = this.filterProperty(data[i], acceptedField, removeIfEmpty);
          if (!removeIfEmpty || (removeIfEmpty === true && typeof data[i] === 'object' && !isEmpty(data[i]))) {
            newData.push(data[i]);
          }
        } else {
          newData.push(data[i]);
        }
      }
      return newData;
    } else if (typeof data === 'object') {
      let newData = {};
      for (let field in data) {
        if (data.hasOwnProperty(field) && acceptedField.includes(field)) {
          if (typeof data[field] === 'object') {
            newData[field] =
                this.filterProperty(data[field], acceptedField, removeIfEmpty);
          } else {
            newData[field] = data[field];
          }
        }
      }
      return newData;
    }
  },

  /**
   * mapField
   * @param {object} data which need to map
   * @param {array} mappedField array mapped [field_need_to_map: mapped_field, function_to_map: function]
   * @param {array} functionList function list (don't pass)
   * @param {bool} recursive is_recursive (don't pass)
   * @returns {object} mapped fields
   */
  mapField: function(
      data, mappedField, functionList = null, recursive = false) {
    if (!recursive) {
      functionList = this.findFunctions(mappedField);
    }
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        data[i] = this.mapField(data[i], mappedField, functionList, true);
      }
      return data;
    } else if (typeof data === 'object') {
      if (functionList.length > 0) {
        for (let i = 0; i < functionList.length; i++) {
          let fieldStr, aliasStr = '';
          if (functionList[i].functionInField) {
            fieldStr = eval(functionList[i].field);
          } else {
            fieldStr = functionList[i].field;
          }
          if (functionList[i].functionInAlias) {
            aliasStr = eval(functionList[i].alias);
            if (functionList[i].functionInField) {
              if (typeof fieldStr === 'string' && fieldStr.indexOf('[') !== -1) {
                if (this.isNotUndefined(data, fieldStr)) {
                  this.createPath(data, aliasStr);
                  eval(aliasStr + ' = ' + fieldStr);
                }
              } else {
                if (fieldStr != undefined) {
                  this.createPath(data, aliasStr);
                  eval(aliasStr + ' = fieldStr');
                }
              }
            } else {
              if (eval('data[' + fieldStr + ']')) {
                this.createPath(data, aliasStr);
                eval(aliasStr + ' = data[' + fieldStr + ']');
              }
            }
          } else {
            aliasStr = functionList[i].alias;
            if (fieldStr.indexOf('[') === -1) {
              if (fieldStr) {
                data[aliasStr] = eval('\'' + fieldStr + '\'');
              }
            } else {
              if (this.isNotUndefined(data, fieldStr)) {
                data[aliasStr] = eval(fieldStr);
              }
            }
          }
        }
      }
      for (let field in data) {
        if (mappedField.hasOwnProperty(field)) {
          if (typeof data[field] === 'object') {
            data[mappedField[field]] =
                this.mapField(data[field], mappedField, functionList, true);
          } else {
            data[mappedField[field]] = data[field];
          }
          delete data[field];
        }
      }
      return data;
    }
  },
  findFunctions: function(map) {
    let newMaps = [];
    for (let ind in map) {
      if (map.hasOwnProperty(ind)) {
        if ((ind.indexOf('(') !== -1 && ind.indexOf(')') !== -1) ||
            (map[ind].indexOf('(') !== -1 && map[ind].indexOf(')') !== -1)) {
          let newMap = {};
          if ((ind.indexOf('(') !== -1 && ind.indexOf(')') !== -1)) {
            newMap.field = 'this.' + ind;
            newMap.functionInField = true;
          } else {
            newMap.field = ind;
            newMap.functionInField = false;
          }
          if (map[ind].indexOf('(') !== -1 && map[ind].indexOf(')') !== -1) {
            newMap.alias = 'this.' + map[ind];
            newMap.functionInAlias = true;
          } else {
            newMap.alias = map[ind];
            newMap.functionInAlias = false;
          }
          newMaps.push(newMap);
        }
      }
    }
    return newMaps;
  },
  createPath: function(data, pathVar) {
    let obj = data;
    let newPath = pathVar.substr(4);
    let regex = /\[(.*?)\]/g;
    do {
      let m = regex.exec(newPath);
      if (m === null) {
        break;
      }
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      let str = m[1];
      if ((str.startsWith('"') && str.endsWith('"')) ||
          (str.startsWith('\'') && str.endsWith('\''))) {
        str = str.substr(1, str.length - 2);
      }
      if (!obj[str]) {
        obj[str] = {};
      }
      obj = obj[str];
    } while (true);
  },
  isNotUndefined: function(data, pathVar) {
    let obj = data;
    let newPath = pathVar.substr(4);
    let regex = /\[(.*?)\]/g;
    do {
      let m = regex.exec(newPath);
      if (m === null) {
        break;
      }
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      let str = m[1];
      if ((str.startsWith('"') && str.endsWith('"')) ||
          (str.startsWith('\'') && str.endsWith('\''))) {
        str = str.substr(1, str.length - 2);
      }
      if (!obj[str]) {
        return false;
      }
      obj = obj[str];
    } while (true);
    return true;
  },
  _a: function(params) {
    let fPos = params.indexOf('[');
    if (fPos === -1) {
      return 'data["' + params + '"]';
    } else {
      return 'data["' + params.substr(0, fPos) + '"]' + params.substr(fPos);
    }
  },
  _filename: function(data, params) {
    let pathVar = this._a(params);
    if (this.isNotUndefined(data, pathVar)) {
      let value = eval(pathVar);
      return path.basename(value);
    } else {
      return '';
    }
  },
  _split: function(data, params, separator = ' ') {
    let pathVar = this._a(params);
    if (this.isNotUndefined(data, pathVar)) {
      let value = eval(pathVar);
      return value.split(separator);
    } else {
      return undefined;
    }
  },
  _toBool: function(data, params) {
    let pathVar = this._a(params);
    if (this.isNotUndefined(data, pathVar)) {
      let value = eval(pathVar);
      if (value === "1") {
        return true;
      } else {
        return false;
      }
    } else {
      return undefined;
    }
  },
  _toString: function(data, params) {
    let pathVar = this._a(params);
    if (this.isNotUndefined(data, pathVar)) {
      let value = eval(pathVar);
      return value + '';
    } else {
      return '';
    }
  }
};

function isEmpty(obj) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};

module.exports = common;