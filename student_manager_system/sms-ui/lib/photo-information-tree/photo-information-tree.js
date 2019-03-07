'use strict';

// Node.js modules.
const accessor = require('sms-accessor');
const classificationList = [
  "施工状況写真",
  "着手前及び完成写真",
  "安全管理写真",
  "使用材料写真",
  "品質管理写真",
  "出来形管理写真",
  "災害写真",
  "事故写真",
  "その他",
];
const kindA = {
  1: "photoClassification",
  2: "constructionType",
  3: "middleClassification",
  4: "smallClassification"
};
const kindB = {
  1: "photoClassification",
  2: "constructionType",
  3: "middleClassification",
  4: "smallClassification"
};
const kindC = {
  1: "largeClassification",
  2: "photoClassification",
  3: "constructionType",
};
const kindD = {
  1: "largeClassification",
  2: "photoClassification",
  3: "constructionType",
  4: "middleClassification",
  5: "smallClassification"
};

let currentTree = null;
let pattern = 0;
let updateWithCommit = false;

let photoInformationTree = {
  getTreeInfo: async function (constructionId, constructionName, strOptimize=false) {
    let tree = await accessor.getPhotoInformationTree(parseInt(constructionId));
    let newTree = [];
    let id = {id: 1};
    let type = 0;
    await recurTreeConverter(tree, newTree, id, type, constructionName);
    currentTree = newTree;

    if(strOptimize) return JSON.stringify(newTree);
    return newTree;
  },
  getTreeInfoForConnect: async function (constructionId) {
    let tree = await accessor.getPhotoInformationTree(parseInt(constructionId));
    let newTree = [];
    let type = 0;
    await recurTreeConverterForConnect(tree, newTree, type);
    return newTree[0];
  },
  getPattern: async function (constructionId, knackType) {
    if(knackType == 3) {
      return 2;
    } else if(knackType == 9) {
      return 3;
    } 
    let setting = await accessor.getConstructionSettings(constructionId);
    let pat = setting.constructionSettings.constructionPhoto.photoTreePattern;
    this.setPattern(pat);
    return pat;
  },
  setPattern: function (newPattern) {
    pattern = newPattern;
  },
  setUpdateWithCommit: function (flag) {
    updateWithCommit = flag;
  },
  getConstructions: async function (knackId, constructionId, strOptimize=false) {
    let result = await accessor.getConstructions();
    let sameKnackConstructions = await getSameKnackConstructions(result, knackId, constructionId);
    let tree = {};
    let treeArray = [];
    let newTree = [];
    let id = {id: 1};
    let type = 0;
    for(let construction of sameKnackConstructions) {
      tree = await accessor.getPhotoInformationTree(parseInt(construction.constructionId));
      await recurTreeConverter(tree, newTree, id, type, construction.constructionName);
      treeArray.push(newTree[0]);
      newTree = [];
    }

    if(strOptimize) return JSON.stringify(treeArray);
    return treeArray;
  },
  getPhotoClassificationMaster: async function (knackId) {
    let result = await accessor.getPhotoClassifications(knackId);
    let converted = convertPhotoClassificationMaster(result, knackId);
    return JSON.stringify(converted);
  },
  getConstructionTypeMaster: async function (knackId, knackType) {
    let result = await accessor.getConstructionTypeMaster(knackId, String(knackType));
    let newTree = [];
    let id = {id: 1};
    let type = 2;
    try {
      recurConstructionTypeMaster(result.constructionTypes, newTree, id, type);
    }
    catch(e) {
      console.log(e);
      return JSON.stringify(result);
    }
    
    return JSON.stringify(newTree);
  },
  getEizenConstructionMaster: async function (strOptimize=false) {
    let result = await accessor.getEizenConstructionMaster();
    let newTree = [];
    let id = {id: 1};
    let type = 0;
    try {
      recurEizenConstructionMaster(result.eizenConstructionRoot, newTree, id, type);
    }
    catch(e) {
      console.log(e);
      return JSON.stringify(result);
    }

    return JSON.stringify(newTree);
  },
  getGeneralConstructionMaster: async function () {
    let result = await accessor.getGeneralConstructionMaster();
    let newTree = [];
    let id = {id: 1};
    let type = 0;
    try {
      recurGeneralConstructionMaster(result.generalConstructionRoot, newTree, id, type);
    }
    catch(e) {
      console.log(e);
      return JSON.stringify(result);
    }

    return JSON.stringify(newTree);
  },
  getCurrentTree: function(strOptimize=false) {
    if(strOptimize) return JSON.stringify(currentTree);
    return currentTree;
  },
  updateCurrentTree: function(tree, constructionId) {
    currentTree = tree;
    if(updateWithCommit) {
      this.commitAlbumInfo(constructionId);
    }
  },
  resetId: function() {
    let id = {id: 2}
    recurResetId(currentTree[0].children, id);
  },
  createBookrackItems: function(){
    let newTree = [];
    recurItemConverter(currentTree[0], newTree, 0);
    return newTree[0];
  },
  commitAlbumInfo: async function (constructionId) {
    let newTree = [];
    if (currentTree != null && currentTree.length > 0) {
      getPhotoInfoItemTree(currentTree[0], newTree);
      await accessor.updatePhotoInformationItems(constructionId, newTree[0]);
    }
  }
};

async function recurTreeConverter(parent, child, id, type, constructionName) {
  let newNode = {};
  let name = "";
  if(constructionName !== undefined) {
    name = constructionName;
  } else {
    name = parent.itemName;
  }
  newNode["id"] = id.id;
  id.id = id.id + 1;
  newNode["name"] = name;
  if(pattern === 1) {
    if(type === 5 ||
      (parent.photoChildItems.length === 0 &&
      classificationList.indexOf(name) >= 0)) {
      newNode["type"] = 1;
    } else {
      newNode["type"] = type;
    }

    if(type === 0) {
      type = 2;
    } else {
      type++;
    }
  } else {
    newNode["type"] = type;
    type++;
  }

  newNode["children"] = [];
  child.push(newNode);
  let childNodes = parent.photoChildItems;
  for(let i = 0; i < childNodes.length ; i++) {
    await recurTreeConverter(childNodes[i], newNode["children"], id, type);
  }
}

async function recurTreeConverterForConnect(parent, child, type) {
  let newNode = {};
  newNode["itemId"] = parent.itemId;
  let name = parent.itemName;
  newNode["itemName"] = name;
  if(pattern === 1) {
    if(type === 5 ||
      (parent.photoChildItems.length === 0 &&
      classificationList.indexOf(name) >= 0)) {
      newNode["kind"] = getKind(1);
    } else {
      newNode["kind"] = getKind(type);
    }

    if(type === 0) {
      type = 2;
    } else {
      type++;
    }
  } else {
    newNode["kind"] = getKind(type);
    type++;
  }

  newNode["children"] = [];
  child.push(newNode);
  let childNodes = parent.photoChildItems;
  for(let i = 0; i < childNodes.length ; i++) {
    await recurTreeConverterForConnect(childNodes[i], newNode["children"], type);
  }
}

function getKind(type) {
  switch(pattern) {
    case 0:
      if(kindA[type] !== undefined) {
        return kindA[type];
      }
      break;
    case 1:
      if(kindB[type] !== undefined) {
        return kindB[type];
      }
      break;
    case 2:
      if(kindC[type] !== undefined) {
        return kindC[type];
      }
      break;
    case 3:
      if(kindD[type] !== undefined) {
        return kindD[type];
      }
      break;
  }
}
async function getSameKnackConstructions(constructions, knackId, constructionId) {
  let sameKnack = [];
  for(let construction of constructions.constructions) {
    if(construction.knack.knackId === knackId && 
      construction.constructionId !== constructionId) {
      let setting = await accessor.getConstructionSettings(construction.constructionId);
      if(pattern === setting.constructionSettings.constructionPhoto.photoTreePattern) {
        sameKnack.push(construction);
      }
    }
  }
  return sameKnack;
}

function convertPhotoClassificationMaster(master, knackId) {
  let converted = [];
  let root = master.constructionRoot;
  let children = [];
  let id = 2;
  let type = 1;

  for(let classification of root.photoLargeCategorys[0].photoClassifications) {
    if([302, 303, 305, 306].includes(knackId) && 
    classification.photoClassificationLabel === '事故写真') {
      continue;
    }
    children.push(
      {
        "id": id,
        "name": classification.photoClassificationLabel,
        "type": type,
      }
    );
    id++;
  }

  converted.push(
    {
      "id": 1,
      "name": root.constructionLabel,
      "type": 0,
      "children": children
    }
  );
  return converted;
}

function recurConstructionTypeMaster(parent, child, id, type) {
  let newNode = {};
  if(parent.hasOwnProperty("constructionTypeName")) {
    newNode["id"] = id.id;
    id.id = id.id + 1;
    newNode["name"] = parent.constructionTypeName;
    newNode["type"] = type;
    newNode["children"] = [];
    child.push(newNode);
    if(parent.hasOwnProperty("constructionTypeChildren")) {
      let childNodes = parent.constructionTypeChildren;
      for(let i = 0; i < childNodes.length ; i++) {
        recurConstructionTypeMaster(childNodes[i], newNode["children"], id, type + 1);
      }
    }
  } else {
    for(let i = 0; i < parent.length ; i++) {
      recurConstructionTypeMaster(parent[i], child, id, type);
    }
  }
}

function recurEizenConstructionMaster(parent, child, id, type) {
  let newNode = {};
  if(parent.hasOwnProperty("eizenConstructionName")) {
    newNode["id"] = id.id;
    id.id = id.id + 1;
    newNode["name"] = parent.eizenConstructionName;
    newNode["type"] = type;
    newNode["children"] = [];
    child.push(newNode);
    if(parent.hasOwnProperty("eizenConstructionChildren")) {
      let childNodes = parent.eizenConstructionChildren;
      for(let i = 0; i < childNodes.length ; i++) {
        recurEizenConstructionMaster(childNodes[i], newNode["children"], id, type + 1);
      }
    }
  } else {
    for(let i = 0; i < parent.length ; i++) {
      recurEizenConstructionMaster(parent[i], child, id, type);
    }
  }
}

function recurGeneralConstructionMaster(parent, child, id, type) {
  let newNode = {};
  if(parent.hasOwnProperty("generalConstructionName")) {
    newNode["id"] = id.id;
    id.id = id.id + 1;
    newNode["name"] = parent.generalConstructionName;
    newNode["type"] = type;
    newNode["children"] = [];
    child.push(newNode);
    if(parent.hasOwnProperty("generalConstructionChildren")) {
      let childNodes = parent.generalConstructionChildren;
      for(let i = 0; i < childNodes.length ; i++) {
        recurGeneralConstructionMaster(childNodes[i], newNode["children"], id, type + 1);
      }
    }
  } else {
    for(let i = 0; i < parent.length ; i++) {
      recurGeneralConstructionMaster(parent[i], child, id, type);
    }
  }
}

function recurItemConverter(parent, child, colorType) {
  let newNode = {};
  newNode["bookrackItemId"] = parent.id;
  newNode["bookrackItemName"] = parent.name;
  newNode["bookrackItemType"] = parent.type;
  newNode["bookrackItemFolder"] = "";
  newNode["colorType"] = colorType;
  newNode["specialType"] = 0;
  newNode["createDate"] = getDate();
  newNode["updateDate"] = getDate();
  newNode["bookrackItems"] = [];
  child.push(newNode);
  if(colorType === 4) {
    colorType = 0;
  } else {
    colorType++;
  }
  if(parent.children !== undefined) {
    let childNodes = parent.children;
    for(let i = 0; i < Object.keys(childNodes).length; i++) {
      recurItemConverter(childNodes[i], newNode["bookrackItems"], colorType);
    }
  }
}

function recurResetId(obj, id) {
  for (var k in obj) {
    obj[k]["id"] = id.id;
    id.id = id.id + 1;
    if (obj[k].hasOwnProperty('children')) {
      recurResetId(obj[k].children, id);
    }
  }
}

function getDate() {
  let now = new Date();
  return now.getFullYear().toString() + "-" + ("0"+(now.getMonth() + 1)).slice(-2).toString() + "-" + ("0"+now.getDate()).slice(-2).toString()
}

function getPhotoInfoItemTree(parent, child) {
  let newNode = {};
  newNode["itemId"] = parent.id;
  newNode["itemName"] = parent.name;
  newNode["photoChildItems"] = [];
  child.push(newNode);
  if(parent.children !== undefined) {
    let childNodes = parent.children;
    for(let i = 0; i < Object.keys(childNodes).length; i++) {
      getPhotoInfoItemTree(childNodes[i], newNode["photoChildItems"]);
    }
  }
}

module.exports = photoInformationTree;