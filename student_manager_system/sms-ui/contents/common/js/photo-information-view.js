'use strict';

const {remote} = require('electron');
const goyoDialog = remote.require('./lib/goyo-dialog-utils');
const goyoAppDefaults = remote.require('./lib/goyo-app-defaults');
const {
  Menu,
  MenuItem
} = remote;
const xlsx = require('xlsx');
const xlsxPopulate = require('xlsx-populate');
const goyoConstructionOperation = remote.require('./lib/goyo-construction-operation');
const {viewMode, AlbumWindowSet, BookrackViewWindowSet} = remote.require('./lib/goyo-window-controller');
const logger = remote.require('./lib/goyo-log')('photo-information-view');
const lockFactory = remote.require('./lib/lock-manager/goyo-lock-manager');
const goyoResources = remote.require('goyo-resources');

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

const typeList = {
  0: "工事名称",
  1: "写真区分",
  2: "工種",
  3: "種別",
  4: "細別",
};

const eizenTypeList = {
  0: "工事名称",
  1: "工事種目",
  2: "施工状況",
  3: "詳細",
};

const generalTypeList = {
  0: "工事名称",
  1: "写真―大分類",
  2: "写真区分",
  3: "工種",
  4: "種別",
  5: "細別",
};

let construction;
let pattern;
let copiedNode;
let classificationData;
let constructionTypeData;
let refined = false;
let lockManager = null;

async function lockSharedConstruction() {
  // acquire shared lock
  try {
    lockManager = await lockFactory.makeLockManagerByConstructionId(construction.constructionId);
    await lockManager.lockConstruction(true);
  } catch(e) {
    logger.error('Failed to lockManager', e);
    // On failure, do not lock
    lockManager = await lockFactory.makeLockManager();
  }
}

async function checkSharedLock(constructionId) {
  try {
    if (lockManager === null) return false; 
    let others = await lockManager.existSharedLockOwners();
    logger.debug(`constructionId=${constructionId}, checkSharedLock=${others}`);
    if (others) {
      await goyoDialog.showConstructionShareLockBusyDialog(
        remote.getCurrentWindow(), others.length);
      return true;
    }
  } catch (e) {
    logger.error('Failed to lockManager', e);
  }
  return false;
}

async function draw(className, json, pattern, drawCheckBox = false, draggable = false, keyboardSupport = true) {
  let $tree = $(className);
  let dblclick = false;
  $tree.tree({
    "data": json, 
    "closedIcon": '+',
    "openedIcon": '-',
    "autoOpen": className === "#referenceTree" && $('#constructionType').prop("checked") ? false: true, 
    "selectable": true,
    "dragAndDrop": false,
    "slide": false,
    "keyboardSupport": keyboardSupport,
    "onCreateLi": function(node, $li, is_selected) {
      if(!(className === "#photoMngTree" && node.type === 0) && draggable) {
        $li.prop("draggable", true);
      }
      if(node.type === 0) {
        $li.find('span').before('<treeInfo pattern="'+ pattern +'" checkbox="'+ drawCheckBox +'" />');
      }
      if(node.hasOwnProperty("albumId")) {
        $li.find('span').before('<img class="albumIcon" draggable="false" src="../common/images/icon/album.png"></span>');
      }
      $li.find('span').after('<input class="editName" style="display: none;" type="text" maxlength="127">');
      switch(pattern) {
        case 0:
          $li.find('span').before(patternA(node, drawCheckBox));
          break;
        case 1:
          $li.find('span').before(patternB(node, drawCheckBox));
          break;
        case 2:
          $li.find('span').before(patternC(node, drawCheckBox));
          break;
        case 3:
          $li.find('span').before(patternD(node, drawCheckBox));
          break;
        default:
          break;
      }
      if(node.id === 1) {
        let image = "url(../common/images/jqtree/treeview-default-line-start.png)";
        let pixel = "10px 7px";
        if(node.getNextSibling()) {
          image += ", url(../common/images/jqtree/treeview-straight-line.png)";
          pixel += ", 0px 10px";
        }
        $li.css("backgroundImage", image);
        $li.css("backgroundPosition", pixel);
      } else {
        if(node.getNextSibling()) {
          $li.css("backgroundImage", "url(../common/images/jqtree/treeview-default-line-start.png), url(../common/images/jqtree/treeview-straight-line.png)");
          $li.css("backgroundRepeat", "no-repeat, repeat-y");
  
          if($li.hasClass("jqtree-folder")) {
            $li.css("backgroundPosition", "9px 7px,0 0");
          } else {
            $li.css("backgroundPosition", "10px 7px,0 0");
          }
        }
      }
    }
  });

  $('#referenceTree').on(
    'tree.init',
    async function() {
      $(document).on("change", "input[type=checkbox]", function(){
        let node = $("#referenceTree").tree("getNodeById", $(this).val());
        if($("input[name=inferenceRadio]:checked")[0].id === "constructionType" &&
        $(node.element).parents("tree")[0].id !== "photoMngTree") {
          loadTree(node, $("#referenceTree"));
        }
        propCheck(this, $("#referenceTree"));
      });
      $(document).on("dragstart", '#referenceTree', function(evt){
        let li = evt.target;
        if (!$(li)[0].firstChild) {
          li = $(li)[0].parentNode.parentNode.parentNode;
        }
        $(li).css("cursor", "pointer");
        let tree = $("#referenceTree");
        let node = tree.tree('getNodeByHtmlElement', li);
        evt.originalEvent.dataTransfer.setData('application/json', JSON.stringify({
          nodeId: node.id,
          mode: "fromReference",
        }));
      });
      $(document).on("dragover", '#main', function(evt){
        evt.stopPropagation();
        evt.preventDefault();
      });
      $(document).on("drop", '#main', async function(evt){
        let data = evt.originalEvent.dataTransfer.getData('application/json');
        if (data) {
          // check other shared lock Construction
          if (await checkSharedLock(construction.constructionId)) {
            return;
          }
          let json = JSON.parse(data);
          if(json.mode === "fromReference") {
            
            let toTree = "photoMngTree";
            let tree = $('#' + toTree);
            let id = {id: 0};
            getMaxId(tree.tree('getNodeById', 1), id);
            var rootNode = tree.tree('getNodeById', 1);

            let nodeId = json.nodeId;
            let node = $('#referenceTree').tree('getNodeById', nodeId);
            let drugNodes = await getDrugNodes('referenceTree', node);
            for(let i = 0; i < Object.keys(drugNodes).length ; i++) {
              if(drugNodes[i].children !== undefined) {
                for(let index in drugNodes[i].children) {
                  let newParent = addNode(rootNode, drugNodes[i].children[index], toTree, id, false);
                  let childNodes = drugNodes[i].children[index].children;
                  if(childNodes !== undefined && childNodes.length !== 0) {
                    addChildNode(newParent, childNodes, drugNodes, toTree, id);
                  }
                }
              }
            }
            photoInformationTree.updateCurrentTree(JSON.parse(tree.tree('toJson')), construction.constructionId);
            syncDbWithRendererTree();
          }
        }
      });
    }
  );
  
  $tree.on(
    'tree.select',
    function(event) {
      if (event.node) {
        let node = event.node;
        if($("input[name=inferenceRadio]:checked")[0].id === "constructionType") {
            if((pattern !== 1 && className === "#photoMngTree" && node.type === 1) || 
                (pattern === 1 && className === "#photoMngTree") ||
                (pattern === 3 && className === "#photoMngTree") || 
                construction.knack.knackType === 3) {
            $("#btnMove").prop("disabled", false);
          } else if(className === "#photoMngTree") {
            $("#btnMove").prop("disabled", true);
          }
        } else if($("input[name=inferenceRadio]:checked")[0].id === "classification") {
          if(pattern === 1 && className === "#photoMngTree" && node.getLevel() !== 5) {
            $("#btnMove").prop("disabled", false);
          } else if(pattern === 1 && className === "#photoMngTree") {
            $("#btnMove").prop("disabled", true);
          }
        }

        changeFooterNodeType(node);
        let sameLevelChildren = $(node.element).parent().children();
        for(let index in sameLevelChildren) {
          if(className === "#photoMngTree" && sameLevelChildren[index] === node.element) {
            if(sameLevelChildren.length === 1) {
              $("#btnUp").prop("disabled", true);
              $("#btnDown").prop("disabled", true);
            } else if(parseInt(index) + 1 === sameLevelChildren.length) {
              $("#btnUp").prop("disabled", false);
              $("#btnDown").prop("disabled", true);
            } else if(parseInt(index) === 0) {
              $("#btnUp").prop("disabled", true);
              $("#btnDown").prop("disabled", false);
            } else {
              $("#btnUp").prop("disabled", false);
              $("#btnDown").prop("disabled", false);
            }
            break;
          }
        }
      }
    }
  );

  $tree.on(
    'tree.open',
    function(event) {
      let node = event.node;
      $tree.tree('selectNode', node);
      if (node) {
        if($("input[name=inferenceRadio]:checked").length > 0 && 
          $("input[name=inferenceRadio]:checked")[0].id === "constructionType" &&
          $(node.element).parents("tree")[0] !== undefined &&
          $(node.element).parents("tree")[0].id !== "photoMngTree") {
          let isChecked = $('#' + $(node.element).parents("tree")[0].id + ' input[value="'+ node.id + '"]').prop('checked') ? true: false;
          loadTree(node, $tree);
          if(isChecked) {
            $('#' + $(node.element).parents("tree")[0].id + ' input[value="'+ node.id + '"]').prop("checked",true);
            node.iterate(function(child_node) {
              $('#' + $(child_node.element).parents("tree")[0].id + ' input[value="'+ child_node.id + '"]').prop("checked",true);
              return true;
            });
          }
        }
      }
    }
  );

  $tree.bind('tree.click', function(e) {
    var node = e.node;
    if (!$tree.tree('getSelectedNode')) {
      let sameLevelChildren = node.parent.children;  
      let index = sameLevelChildren.indexOf(node);
      if(className === "#photoMngTree" && index === 0) {
        $("#btnUp").prop("disabled", true);
      } else if(className === "#photoMngTree") {
        $("#btnUp").prop("disabled", false);
      }
      if(className === "#photoMngTree" && index === sameLevelChildren.length - 1) {
        $("#btnDown").prop("disabled", true);
      } else if(className === "#photoMngTree") {
        $("#btnDown").prop("disabled", false);
      }
    } else if ($tree.tree('getSelectedNode') && $tree.tree('getSelectedNode').id !== node.id) {
      let sameLevelChildren = node.parent.children;  
      let index = sameLevelChildren.indexOf(node);
      if(className === "#photoMngTree" && index === 0) {
        $("#btnUp").prop("disabled", true);
      } else if(className === "#photoMngTree") {
        $("#btnUp").prop("disabled", false);
      }
      if(className === "#photoMngTree" && index === sameLevelChildren.length - 1) {
        $("#btnDown").prop("disabled", true);
      } else if(className === "#photoMngTree") {
        $("#btnDown").prop("disabled", false);
      }
    } else if ($tree.tree('getSelectedNode') && $tree.tree('getSelectedNode').id === node.id) {
      setTimeout(function () {
        if(!dblclick && $(node.element).parents("tree")[0].id === "photoMngTree") {
          editName(node, $tree);
        } else {
          dblclick = false;
        }
      }, 300);
    }
  });

  $tree.on(
    'tree.dblclick',
    function(event) {
      dblClick(event.node, $tree);
      dblclick = true;
      return;
    }
  );

  $tree.on(
    'tree.contextmenu',
    function(event) {
      var node = event.node;
      let displayAll = displayAllMenu();
      let id = $(node.element).parents("tree")[0].id;
      if(typeof displayAll !== 'boolean' || id === "referenceTree") {
        return;
      }
      $tree.tree('selectNode', node);
      let isTopNode = node.id === 1 ? true: false;
      let hasAlbumId = node.albumId ? true: false;
      let isFirstNode = false;
      let isLastNode = false;
      let maxLevel = 0;
      switch(pattern) {
        case 0:
          maxLevel = 4;
          break;
        case 1:
          maxLevel = 4;
          break;
        case 2:
          maxLevel = 3;
          break;
        case 3:
          maxLevel = 5;
          break;
        default:
          break;
      }
      let canInsert = node.getLevel() <= maxLevel ? true: false;
      let sameLevelChildren = $(node.element).parent().children();
      for(let index in sameLevelChildren) {
        if(sameLevelChildren[index] === node.element) {
          if(sameLevelChildren.length === 1) {
            isFirstNode = true;
            isLastNode = true;
          } else if(parseInt(index) + 1 === sameLevelChildren.length) {
            isLastNode = true;
          } else if(parseInt(index) === 0) {
            isFirstNode = true;
          }
          break;
        }
      }
      const menu = new Menu();
      menu.append(new MenuItem({
        label: '挿入',
        click() {
          insertNode(node, $tree);
        },
        enabled: canInsert
      }));
      menu.append(new MenuItem({
        label: '変更',
        click() {
          editName(node, $tree);
        },
        enabled: !isTopNode
      }));
      menu.append(new MenuItem({
        label: '削除',
        click() {
          deleteTree(id);
        },
        enabled: !isTopNode
      }));
      menu.append(new MenuItem({
        label: '上に移動',
        click() {
          exchangeTree(id, true);
        },
        enabled: !(isTopNode || isFirstNode),
        visible: displayAll
      }));
      menu.append(new MenuItem({
        label: '下に移動',
        click() {
          exchangeTree(id, false);
        },
        enabled: !(isTopNode || isLastNode),
        visible: displayAll
      }));
      menu.append(new MenuItem({
        label: 'コピー',
        async click() {
          // check other shared lock Construction
          if (await checkSharedLock(construction.constructionId)) {
            return;
          }
          copiedNode = {
            name: node.name,
            id: node.id,
            type: node.type,
            children: node.children,
            level: node.getLevel()
          };
        },
        enabled: !isTopNode
      }));
      menu.append(new MenuItem({
        label: '貼り付け',
        async click() {
          // check other shared lock Construction
          if (await checkSharedLock(construction.constructionId)) {
            return;
          }
          if(copiedNode.level - 1 === node.getLevel()){
            let maxId = {id: 0};
            getMaxId($tree.tree('getNodeById', 1), maxId);
            addNode(node, copiedNode, id, maxId, true);
            photoInformationTree.updateCurrentTree(JSON.parse($tree.tree('toJson')), construction.constructionId);
            syncDbWithRendererTree();
            $tree.tree('openNode', node);
          }
        },
        enabled: !(isTopNode || !copiedNode)
      }));
      menu.append(new MenuItem({
        label: 'アルバムを開く',
        async click() {
          try {
            let album = await AlbumWindowSet.open(construction.constructionId, node.albumId);
            album.once('failed', () => {
              goyoDialog.showAlbumLockBusyDialog(remote.getCurrentWindow());
            });
          } catch(e) {
            await goyoDialog.showAlbumLockBusyDialog(remote.getCurrentWindow());
          }
        },
        enabled: hasAlbumId,
        visible: displayAll
      }));
      event.preventDefault();
      menu.popup({
        window: remote.getCurrentWindow()
      });
    }
  );
  $tree.tree('selectNode', $("#photoMngTree").tree('getNodeById', 1));
};

function addAlbumNode(notExistNodes) {
  let tree = $("#photoMngTree");
  var rootNode = tree.tree('getNodeById', 1);
  let node = {};
  let type = pattern === 1 ? 1: 0;
  let id = {id: 0};
  getMaxId(tree.tree('getNodeById', 1), id);
  for(let notExistNode of notExistNodes) {
    type = pattern === 1 ? 1: 0;
    let newParent = rootNode;

    if((pattern === 2 || pattern === 3) &&
      notExistNode.largeClassification !== "") {
      node.name = notExistNode.largeClassification;
      node.type = ++type;
      newParent = addNode(newParent, node, "photoMngTree", id, false);
    } else if (pattern === 2 || pattern === 3) {
      continue;
    }

    if(notExistNode.photoClassification !== "") {
      node.name = notExistNode.photoClassification;
      node.type = ++type;
    } else {
      if (pattern === 2 || pattern === 3) {
        newParent.albumId = notExistNode.albumId;
        tree.tree("updateNode", newParent, newParent);
        continue;
      } else {
        continue;
      }
    }

    newParent = addNode(newParent, node, "photoMngTree", id, false);

    if(notExistNode.constructionType !== "") {
      node.name = notExistNode.constructionType;
      node.type = ++type;
    } else {
      newParent.albumId = notExistNode.albumId;
      tree.tree("updateNode", newParent, newParent);
      continue;
    }

    newParent = addNode(newParent, node, "photoMngTree", id, false);

    if(notExistNode.middleClassification !== "") {
      node.name = notExistNode.middleClassification;
      node.type = ++type;
    } else {
      newParent.albumId = notExistNode.albumId;
      tree.tree("updateNode", newParent, newParent);
      continue;
    }
    
    newParent = addNode(newParent, node, "photoMngTree", id, false);

    if(notExistNode.smallClassification !== "") {
      node.name = notExistNode.smallClassification;
      if(pattern === 1) {
        node.type = 1;
      } else {
        node.type = ++type;
      }
    } else {
      newParent.albumId = notExistNode.albumId;
      tree.tree("updateNode", newParent, newParent);
      continue;
    }

    addNode(newParent, node, "photoMngTree", id, false);
  }
  
  photoInformationTree.updateCurrentTree(JSON.parse(tree.tree('toJson')), construction.constructionId);
  syncDbWithRendererTree();
}

function getChildNode(id, children) {
  for(let child of children) {
    if(child.id === id) {
      return child;
    }
    if(child.children !== undefined && child.children.length !== 0) {
      getChildNode(id, child.children);
    }
  }
  return null;
}

async function insertNode(targetNode, tree) {
  let id = {id: 0};
  // check other shared lock Construction
  if (await checkSharedLock(construction.constructionId)) {
    return;
  }
  getMaxId(tree.tree('getNodeById', 1), id);
  let type = null;
  if(pattern === 1){
    if(targetNode.getLevel() === 4) {
      type = 1;
      if(targetNode.type === 1) {
        targetNode.type = targetNode.getLevel();
        tree.tree('updateNode', targetNode, targetNode);
      }
    } else 
    if(targetNode.getLevel() <= 3 && targetNode.type === 1) {
      type = parseInt(targetNode.getLevel()) + 1;
      targetNode.type = targetNode.getLevel();
      tree.tree('updateNode', targetNode, targetNode);
    } else if(targetNode.getLevel() <= 3) {
      type = parseInt(targetNode.getLevel()) + 1;  
    } else {
      type = 1;
    }
  } else {
    type = targetNode.getLevel();
  }
  tree.tree(
    'appendNode',
    {
        name: 'NewItem',
        id: id.id + 1,
        type: type
    },
    targetNode
  );
  photoInformationTree.updateCurrentTree(JSON.parse(tree.tree('toJson')), construction.constructionId);
  syncDbWithRendererTree();
  tree.tree('openNode', targetNode);
  let newNode = tree.tree('getNodeById', id.id + 1);
  tree.tree('selectNode', newNode);
  editName(newNode, tree);
}

async function editName(node, tree) {
  // check other shared lock Construction
  if (await checkSharedLock(construction.constructionId)) {
    return;
  }
  if(node.type === 0) {
    return;
  }
  let firstChild = node.element.firstElementChild;
  let editName = $(firstChild).find(".editName");
  editName.off("blur keypress");
  let label = $(firstChild).find(".jqtree-title");
  label.css('display', 'none');

  $(editName)
      .val(label.text())
      .css('display', '')
      .focus();
  editName.select();
  let editting = false;
  editName.on("blur keypress", (async function(e) {
    if(e.keyCode === 13 || e.type === "blur")
    {
      if(editting) {
        return;
      }
      editting = true;

      // D&Dでアルバムの禁止文字が持って行けてしまうためアルバム設定と同じチェックを入れる
      if (editName.val().match(/^.*[\\|/|:|\*|?|\"|<|>|\||:].*$/)) {
        await goyoDialog.showErrorMessageDialog(
          remote.getCurrentWindow(), goyoAppDefaults.DIALOG_TITLE,
          '\\/:*?"<>|などの文字は使用できません。', 'OK');
        editting = false;
        return;
      }

      let sameLevelChildren = node.parent.children;
      for(let child of sameLevelChildren) {
        if(child.name === editName.val() &&
            node.id !== child.id &&
            editName.val() !== "NewItem") {
          await goyoDialog.showWarningMessageDialog(
            remote.getCurrentWindow(),
            '写真整理情報',
            '名称が重複しています!!',
            'OK'
          );
          editting = false;
          return;
        }
      }
      if(pattern === 1){
        if(node.children.length === 0 &&
          classificationList.indexOf(editName.val()) >= 0) {
          node.type = 1;
        } else if(node.getLevel() === 5) {
          node.type = 1;
        } else {
          node.type = node.getLevel();
        }
      }
    
      editName.css('display', 'none');
      label.css('display', '');
      tree.tree('updateNode', node, editName.val());
      photoInformationTree.updateCurrentTree(JSON.parse(tree.tree('toJson')), construction.constructionId);
      syncDbWithRendererTree();
      editting = false;
    }
  }));
}

function propCheck(element, $tree) {
  let node = $tree.tree('getNodeById', parseInt($(element).val()));
  if ($(element).is(':checked')) {
    $('#' + $(node.element).parents("tree")[0].id + ' input[value="'+ node.id + '"]').prop("checked",true);
    node.iterate(function(child_node) {
        $('#' + $(child_node.element).parents("tree")[0].id + ' input[value="'+ child_node.id + '"]').prop("checked",true);
        return true;
    });
    let parentNode = node.parent;
    while(parentNode.type >= 0){
      $('#' + $(parentNode.element).parents("tree")[0].id + ' input[value="'+ parentNode.id + '"]').prop("checked",true);
      if(parentNode.parent){
        parentNode = parentNode.parent;
      }
    }
  } else {
    $('#' + $(node.element).parents("tree")[0].id + ' input[value="'+ node.id + '"]').prop("checked",false);
    node.iterate(function(child_node) {
      $('#' + $(child_node.element).parents("tree")[0].id + ' input[value="'+ child_node.id + '"]').prop("checked",false);
      return true;
    });
  }
}

async function getDrugNodes(fromTree, node) {
  let tree = $('#' + fromTree);
  let treeObj = JSON.parse(tree.tree('toJson')); 
  let drugIds = [];
  drugIds.push(node.id);

  let parentNode = node.parent;
  while(parentNode.type >= 0){
    drugIds.push(parentNode.id);
    if(parentNode.parent){
      parentNode = parentNode.parent;
    }
  };

  await recurDrugId(node.children, drugIds);

  let newTree = {};
  $.extend(true, newTree, treeObj);

  for(let index in newTree) {
    let node = newTree[index];
    if(drugIds.indexOf(node.id) > -1) {
      if(node.children) {
        await recurDrugNode(node.children, drugIds);
      }
    } else {
      delete newTree[index];
    }
  }

  return newTree; 
}

async function recurDrugId(children, drugIds) {
  for(let i = 0; i < children.length ; i++) {
    drugIds.push(children[i].id);
    if(children[i].children) {
      await recurDrugId(children[i].children, drugIds);
    }
  }
}

async function recurDrugNode(children, drugIds) {
  for(let i = 0; i < children.length ; i++) {
    if(drugIds.indexOf(children[i].id) > -1) {
      if(children[i].children) {
        await recurDrugNode(children[i].children, drugIds);
      }
    }
    else {
      delete children[i];
    }
  }
}

function addNode(toNode, fromNode, className, maxId, iterateChildNode = true) {
  if(fromNode === undefined) {
    return false;
  }
  maxId.id = Number(maxId.id) + 1;
  let sameLevelChildren = toNode.children;
  let sameNameNode = null;

  for(let sameNode of sameLevelChildren) {
    if(sameNode.name === fromNode.name) {
      sameNameNode = sameNode;
      break;
    }
  }

  let newParent = null;
  if(!sameNameNode) {
    newParent = $("#" + className).tree(
      "appendNode" , {
        name: fromNode.name,
        id:   maxId.id,
        type: fromNode.type
      }, toNode
    );
  } else {
    newParent = sameNameNode;
  }
  if(pattern === 1) {
    if(classificationList.indexOf(newParent.name) >= 0 &&
        newParent.parent.type === 1) {
      newParent.parent.type = newParent.parent.getLevel();
      let parent = {
        id: newParent.parent.id,
        name: newParent.parent.name,
        type: newParent.parent.type,
        children: newParent.parent.children,
      }
      $("#" + className).tree('updateNode', newParent.parent, parent);
    }
  }
  $("#" + className).tree('openNode', toNode);
  if(iterateChildNode) {
    if(fromNode.children.length !== 0) {
      for(let i = 0; fromNode.children.length !== 0; i++) {
        let result = addNode(newParent, fromNode.children[i], className, maxId);
        if(result === false) {
          break;
        }
      }
    }
  }
  else {
    return newParent;
  }
}

async function reDrawTree(focusRootNode = false) {
  treeData = JSON.parse(photoInformationTree.getCurrentTree(true));
  let data = JSON.parse(await photoInformationTree.getConstructions(construction.knack.knackId, 0, true));
  $('#photoMngTree').tree('loadData', treeData);
  if($("input[name=inferenceRadio]:checked")[0].id === "constructionList") {
    $('#referenceTree').tree('loadData', data);
  }
  if(focusRootNode) {
    $('#photoMngTree').tree('selectNode', $('#photoMngTree').tree('getNodeById', 1));
  }
}

function patternA(node, drawCheckBox) {
  let checkBoxTag = "";
  if(drawCheckBox) {
    checkBoxTag = '<span><input type="checkbox" name="' + node.name + '" value="' + node.id + '"></span>';
  }

  switch(node.type) {
    case 0:
      return '<span class="root"></span>' + checkBoxTag;
    case 1:
      return '<span class="photoClassification"></span>' + checkBoxTag;
    case 2:
      return '<span class="constructionType"></span>' + checkBoxTag;
    case 3:
      return '<span class="middleClassification"></span>' + checkBoxTag;
    case 4:
      return '<span class="smallClassification"></span>' + checkBoxTag;
    default:
      return checkBoxTag;
  }
}

function patternB(node, drawCheckBox) {
  let checkBoxTag = "";
  if(drawCheckBox) {
    checkBoxTag = '<span><input type="checkbox" name="' + node.name + '" value="' + node.id + '"></span>';
  }

  switch(node.type) {
    case 0:
      return '<span class="root"></span>' + checkBoxTag;
    case 1:
      return '<span class="photoClassification"></span>' + checkBoxTag;
    case 2:
    case 3:
    case 4:
      if(node.children.length == 0 && 
        classificationList.indexOf(node.name) >= 0) {
          return '<span class="photoClassification"></span>' + checkBoxTag;
      }
      else {
        switch(node.type) {
          case 2:
            return '<span class="constructionType"></span>' + checkBoxTag;
          case 3:
            return '<span class="middleClassification"></span>' + checkBoxTag;
          case 4:
            return '<span class="smallClassification"></span>' + checkBoxTag;
        }
      }
    default:
      return checkBoxTag;
  }
}

function patternC(node, drawCheckBox) {
  let checkBoxTag = "";
  if(drawCheckBox) {
    checkBoxTag = '<span><input type="checkbox" name="' + node.name + '" value="' + node.id + '"></span>';
  }

  switch(node.type) {
    case 0:
      return '<span class="root"></span>' + checkBoxTag;
    case 1:
      return '<span class="largeClassification_c"></span>' + checkBoxTag;
    case 2:
      return '<span class="photoClassification_c"></span>' + checkBoxTag;
    case 3:
      return '<span class="constructionType_c"></span>' + checkBoxTag;
    default:
      return checkBoxTag;
  }
}

function patternD(node, drawCheckBox) {
  let checkBoxTag = "";
  if(drawCheckBox) {
    checkBoxTag = '<span><input type="checkbox" name="' + node.name + '" value="' + node.id + '"></span>';
  }

  switch(node.type) {
    case 0:
      return '<span class="root"></span>' + checkBoxTag;
    case 1:
      return '<span class="largeClassification"></span>' + checkBoxTag;
    case 2:
      return '<span class="photoClassification"></span>' + checkBoxTag;
    case 3:
      return '<span class="constructionType"></span>' + checkBoxTag;
    case 4:
      return '<span class="middleClassification"></span>' + checkBoxTag;
    case 5:
      return '<span class="smallClassification"></span>' + checkBoxTag;
    default:
      return checkBoxTag;
  }
}

async function moveTree(toTree, fromTree) {
  let toNode = null;
  let targetNode = null;
  let isConstructionType = $("input[name=inferenceRadio]:checked")[0].id === "constructionType" ? true: false;
  let isClassification = $("input[name=inferenceRadio]:checked")[0].id === "classification" ? true: false;
  let selectedNode = $("#" + toTree).tree('getSelectedNode');

  if(pattern === 1 && isClassification && selectedNode.getLevel() >= 5) {
    return;
  }
  if(isConstructionType && construction.knack.knackType !== 3 && construction.knack.knackType !== 9) {
    if((pattern !== 1 && selectedNode.type !== 1) || 
        selectedNode === false) {
      return;
    } else if(pattern === 1) {
      toNode = $("#" + toTree).tree('getNodeById', 1);
    } else {
      toNode = selectedNode;
    }
  } else if(isClassification && pattern === 1) {
    if(selectedNode === false) {
      return;
    }
    toNode = selectedNode;
  } else {
    toNode = $("#" + toTree).tree('getNodeById', 1);
  }

  let fromNode = await getFromNode(fromTree);
  if(fromNode.length === 0) {
    return;
  }
  // 入れ先のノードを確保
  targetNode = toNode;
  
  let id = {id: 0};
  getMaxId($("#" + toTree).tree('getNodeById', 1), id);
  for(let index in fromNode) {
    if(fromNode[index].children !== undefined) {
      if(isConstructionType && pattern < 2) {
        toNode = addNode(toNode, fromNode[index], toTree, id, false);
      }
      for(let childIndex in fromNode[index].children) {
        let newParent = addNode(toNode, fromNode[index].children[childIndex], toTree, id, false);
        if(fromNode[index].children[childIndex].children !== undefined) {
          let childNodes = fromNode[index].children[childIndex].children;
          if(childNodes.length !== 0) {
            addChildNode(newParent, childNodes, fromNode, toTree, id);
          }
        }
      }
    }
    if(isConstructionType) {
      toNode = targetNode;
    }
  }
  photoInformationTree.updateCurrentTree(JSON.parse($("#" + toTree).tree('toJson')), construction.constructionId);
  syncDbWithRendererTree();
}

function addChildNode(parent, childNodes, fromNode, toTree, id) {
  for(let i = 0; i < childNodes.length ; i++) {
    let newParent = addNode(parent, childNodes[i], toTree, id, false);
    if(childNodes[i] !== undefined && childNodes[i].hasOwnProperty("children") && childNodes[i].children.length > 0) {
      addChildNode(newParent, childNodes[i].children, fromNode, toTree, id);
    }
  }
}

async function getFromNode(fromTree) {
  let tree = $('#' + fromTree);
  let newTree = {};
  $.extend(true, newTree, JSON.parse(tree.tree('toJson')));
  let checkedNode = $("input[type=checkbox]:checked");
  let checkedIds = [];
  for(let checked of checkedNode) {
    checkedIds.push(checked.value);
  }
  for(let index in newTree) {
    let node = newTree[index];
    if(checkedIds.indexOf(String(node.id)) > -1) {
      if(node.children) {
        await recurFromNode(node.children, checkedIds);
      }
    } else {
      delete newTree[index];
    }
  }
  return newTree; 
}

async function recurFromNode(children, checkedIds) {
  for(let i = 0; i < children.length ; i++) {
    if(checkedIds.indexOf(String(children[i].id)) > -1) {
      if(children[i].children) {
        await recurFromNode(children[i].children, checkedIds);
      }
    }
    else {
      delete children[i];
    }
  }
}

async function deleteTree(fromTree) {
  // check other shared lock Construction
  if (await checkSharedLock(construction.constructionId)) {
    return;
  }
  fromTree = "#" + fromTree;
  let removeNode = $(fromTree).tree('getSelectedNodes');

  let parent = $(fromTree).tree('getNodeById', removeNode[0].parent.id);
  for(let i = 0; i < removeNode.length ; i++) {
    $(fromTree).tree('removeNode', removeNode[i]);
  }
  if(pattern === 1 && parent.children.length === 0 && classificationList.indexOf(parent.name) >= 0) {
    let newParent = {
      id: parent.id,
      name: parent.name,
      type: 1,
      children: [],
    }
    $(fromTree).tree('updateNode', parent, newParent);
  }
  photoInformationTree.updateCurrentTree(JSON.parse($(fromTree).tree('toJson')), construction.constructionId);
  syncDbWithRendererTree();
}

$("#btnUp").on("click", function(){
  exchangeTree("photoMngTree", true);
}); 

$("#btnDown").on("click", function(){
  exchangeTree("photoMngTree", false);
}); 

async function exchangeTree(tree, isUp = true) {
  // check other shared lock Construction
  if (await checkSharedLock(construction.constructionId)) {
    return;
  }

  let selectedNode = $("#" + tree).tree('getSelectedNode');
  let sameLevelChildren = selectedNode.parent.children;

  let index = sameLevelChildren.indexOf(selectedNode);
  if(isUp && index === 0) {
    alert('一番上のノードです。');
    return false;
  } else if(!isUp && index === sameLevelChildren.length - 1) {
    alert('一番下のノードです。');
    return false;
  }
  let afterIndex = 0;
  let moveType = "";
  if(isUp) {
    afterIndex = index - 1;
    moveType = "before";
  } else {
    afterIndex = index + 1;
    moveType = "after";
  }

  $("#" + tree).tree('moveNode', selectedNode, selectedNode.parent.children[afterIndex], moveType);
  if(afterIndex === 0) {
    $("#btnUp").prop("disabled", true);
    $("#btnDown").prop("disabled", false);
  } else if(afterIndex === sameLevelChildren.length - 1) {
    $("#btnUp").prop("disabled", false);
    $("#btnDown").prop("disabled", true);
  } else {
    $("#btnUp").prop("disabled", false);
    $("#btnDown").prop("disabled", false);
  }
  photoInformationTree.updateCurrentTree(JSON.parse($("#" + tree).tree('toJson')), construction.constructionId);
  syncDbWithRendererTree();
}

function getMaxId(tree, id) {
  if(tree === undefined) {
    return;
  }
  if(Number(id.id) < Number(tree.id)) {
    id.id = Number(tree.id);
  }

  for(let i = 0; i < tree.children.length; i++) {
    getMaxId(tree.children[i], id)
  }
}

function changeFooterNodeType(node) {
  if(node.type === 0 && $(node.element).parents("tree")[0].id !== "photoMngTree" &&
    ($("input[name=inferenceRadio]:checked")[0].id === "constructionType" || 
    $("input[name=inferenceRadio]:checked")[0].id === "classification")) {
    $("#nodeType").html('マスタ区分');
  } else if(construction.knack.knackType === 3) {
    $("#nodeType").html(eizenTypeList[node.type]);
  } else if(construction.knack.knackType === 9) {
    $("#nodeType").html(generalTypeList[node.type]);
  } else {
    $("#nodeType").html(typeList[node.type]);
  }
}

function dblClick(node, $tree) {
  if (node.is_open === true) {
    $tree.tree('closeNode', node);
  } else {
    $tree.tree('openNode', node);
  }
}

function loadTree(node, $tree) {
  let childNode = null;
  let data = null;

  if(refined) {
    data = JSON.parse($tree.tree('toJson'));
  } else {
    data = constructionTypeData;
  }
  for(let child of data) {
    if(node.id === child.id) {
      childNode = child;
      break;
    } else {
      continue;
    }
    let result = getChildNode(node.id, child.children);
    if(result !== null) {
      childNode = result;
      break;
    }
  }
  if(!childNode) {
    return;
  }
  let newNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    children: childNode.children
  };
  $tree.tree('updateNode', node, newNode);
}

async function setTabData() {
  if(construction.knack.knackType === 9) {
    $("#classificationLabel").css("display", "none");
    $("#radio2").html($("#radio2").html().replace("工種", "一般建築"));
    constructionTypeData = JSON.parse(await photoInformationTree.getGeneralConstructionMaster());
  } else if(construction.knack.knackType === 3) {
    $("#classificationLabel").css("display", "none");
    $("#radio2").html($("#radio2").html().replace("工種", "建築"));
    constructionTypeData = JSON.parse(await photoInformationTree.getEizenConstructionMaster());
  } else {
    classificationData = JSON.parse(await photoInformationTree.getPhotoClassificationMaster(construction.knack.knackId));
    constructionTypeData = JSON.parse(await photoInformationTree.getConstructionTypeMaster(construction.knack.knackId, construction.knack.knackType));
  }
}

function setPattern(newPattern) {
  pattern = newPattern;
  photoInformationTree.setPattern(newPattern);
}

function exchangeRadioButton(changeMargin = true) {
  if(pattern === 1) {
    if($('#classificationLabel') && $('#constructionTypeRadio')) {
      $('#constructionTypeRadio').after($('#classificationLabel'));
    }
  } else {
    if($('#classificationLabel') && $('#constructionTypeRadio')) {
      $('#classificationLabel').after($('#constructionTypeRadio'));
    }
  }
  if(changeMargin) {
    if(pattern !== 0) {
      $('#constructionTypeRadio').css("margin-left", "20px");
      $('#classificationLabel').css("margin-left", "3px");
    } else {
      $('#constructionTypeRadio').css("margin-left", "3px");
      $('#classificationLabel').css("margin-left", "20px");
    }
  }
}

function openTree(treeName) {
  let tree = $(treeName).tree('getTree');
  tree.iterate(
    function(node, level) {
      if (node.hasChildren()) {
        $(treeName).tree('openNode', node);
        return true;
      }
      return false;
    }
  );
}

$("#constructionInfo").on("click", async function(){
  $("#constructionInfo").prop("disabled", true);
  try {
    // check other shared lock Construction
    if (await checkSharedLock(construction.constructionId)) {
      return;
    }
    disableBookrackWindowSet();
    let win = remote.getCurrentWindow();
    win.hide();

    let result = await goyoConstructionOperation.edit(remote.getCurrentWindow(), construction.constructionId);
    if(!result) {
      win.show();
      enableBookrackWindowSet();
      return;
    }
    construction = (await bookrackAccessor.getConstructionDetail(parseInt(result.constructionId))).construction;
    let tree = $("#photoMngTree");
    tree.tree("updateNode", tree.tree('getNodeById', 1), construction.constructionName);
    win.show();
    enableBookrackWindowSet();
  } catch(e) {
    logger.error('EditConstructionInfo', e);
  } finally {
    $("#constructionInfo").prop("disabled", false);
  }
});

$("#selectConstruction").on("click", function(){
  viewMode.closeCurrentModeWindow();
  viewMode.setNextMode(viewMode.MODE_CONSTRUCTION_SELECTION, {selectionMode: 'normal', defaultConstructionId: construction.constructionId});
  window.close();
});
$("#outputExcel").on("click", async function(){
  // 選択されている要領によってベースとなるExcelを決める
  const EXCEL_PATH = await goyoResources.getExcelTemplate(construction.knack.knackType, construction.knack.knackId);
  const EXCEL_ADD_NAME = (()=>{
    switch(construction.knack.knackType){
      case 3:// 営繕
        return "_建築マスタ.xlsx";
      case 9:// 一般建築
        return "_一般建築マスタ.xlsx";
      case 6:// NEXCO
        return "_分類マスタ（NEXCO）.xlsx";
      default:
        switch(construction.knack.knackId){
          case 70:
          case 71:
          case 73:
          case 9:
          case 305:
          case 306:
          case 302:
          case 303:
            return "_分類マスタ.xlsx";
          default:
            return "_分類マスタ.xlsx";
        }
    }
  })();

  // ファイル選択ダイアログを表示してファイル出力先設定
  let saveFileName = await goyoDialog.showSaveFileSelectionDialog(
    remote.getCurrentWindow(),
    goyoAppDefaults.DIALOG_SAVE_EXCEL_TITLE,
    construction.constructionName+EXCEL_ADD_NAME,
    goyoAppDefaults.inputExcelFilter
  );
  if(!saveFileName){
    return;
  }
  try{
    // ツリー情報を取得してエクセルを更新する
    let treeData = JSON.parse(photoInformationTree.getCurrentTree(true));
    let book = await xlsxPopulate.fromFileAsync( EXCEL_PATH );
    var sheet = book.sheet(0);
    let sheetPutDatas = [];
    let row_i = 0;
    let maxCol_i = 0;
    let rowData = [];
    let makeSheetData = ((currentTreeData, col_i ) =>{
      if(typeof currentTreeData !== "undefined"){
        for(let i=0; i<currentTreeData.length; i++){
          rowData[col_i] = currentTreeData[i].name;
          if( currentTreeData[i].children && currentTreeData[i].children.length>0 ){
            makeSheetData(currentTreeData[i].children, col_i+1)
          }else{
            // 子がいないのでここまでのデータで出力
            sheetPutDatas[row_i]=[];
            for(let j=0; j<=col_i; j++){
              sheetPutDatas[row_i][j]=rowData[j];
            }
            row_i++;
            maxCol_i = Math.max(maxCol_i, col_i);
          }
        }
      }
    });
    makeSheetData(treeData[0].children, 0);
    if(sheetPutDatas.length>0){
      // 先頭行の範囲で書き込まれるので、先頭行を最大列分、空文字で用意。
      for(let i=0; i<=maxCol_i; i++){
        if(!sheetPutDatas[0][i]){
          sheetPutDatas[0][i] = "";
        }
      }
      sheet.cell( "A3" ).value( sheetPutDatas );
    }
    await book.toFileAsync( saveFileName );
    await goyoDialog.showSimpleMessageDialog(
      remote.getCurrentWindow(),
      '写真整理ツール',
      '写真整理情報を保存しました。',
      'OK'
    );
  }catch(e){
    console.log(e);
    await goyoDialog.showWarningMessageDialog(
      remote.getCurrentWindow(),
      '写真整理ツール',
      '写真整理情報の保存に失敗しました。',
      'OK'
    );
  }
});

$("#inputExcel").on("click", async function(){
  // check other shared lock Construction
  if (await checkSharedLock(construction.constructionId)) {
    return;
  }
  // ユーザーに読み込みを実行するか問う
  let q =  await goyoDialog.showSimpleBinaryQuestionDialog(
      remote.getCurrentWindow(),
      '写真整理ツール',
      '現在設定されている写真整理情報を上書きします。\nよろしいですか？',
      "OK", "キャンセル", false
  );
  if(!q){
    return;
  }
  
  let fileList = await goyoDialog.showOpenFileSelectionDialog(
    remote.getCurrentWindow(),
    goyoAppDefaults.DIALOG_INPUT_EXCEL_TITLE,
    undefined,
    goyoAppDefaults.inputExcelFilter,
    false
  );
  if (!fileList) {
    return;
  }
  
  let book = xlsx.readFile(fileList[0]);
  // 常に先頭の１シートのみ対象とする
  let sheetName = book.SheetNames[0];
  let sheet = book.Sheets[sheetName];

  // 選択要領ごとの階層名定義
  const COL_NAMES = (()=>{
    switch( construction.knack.knackType ){
      case 3: // 営繕
        return ["工事種目","施工状況","詳細"];
      case 9: // 一般建築
        return ["大分類","写真区分","工種","種別","細別"];
      default:
        return ["写真区分","工種","種別","細別"];
    }
  })();

  // 選択要領ごとの写真区分
  const EXPECTED = (()=>{
    return [];
    // 制限を解除したい旨の相談あり。仕様確定後にコメントアウトを削除し、該当判定部分を削除。
    // switch(construction.knack.knackType){
    //   case 3:
    //   case 9:
    //     return [];
    //   case 6:// NEXCO
    //     return ["着手前写真","施工状況写真","検査写真","安全管理写真","完成写真","災害写真","その他写真"];
    //   default:
    //     switch(construction.knack.knackId){
    //       case 70:
    //       case 71:
    //       case 73:
    //       case 9:
    //       case 305:
    //       case 306:
    //       case 302:
    //       case 303:
    //         return ["着手前及び完成写真","施工状況写真","安全管理写真","使用材料写真","品質管理写真","出来形管理写真","災害写真","その他"];
    //       default:
    //         return ["着手前及び完成写真","施工状況写真","安全管理写真","使用材料写真","品質管理写真","出来形管理写真","災害写真","事故写真","その他"];
    //     }
    // }
  })();
  const createErrorMessage = (errorMessages, isKubunError) =>{
    let appendMessage = "";
    if(isKubunError && EXPECTED.length>0){
      appendMessage = "\n\n写真区分には「"+EXPECTED.join("/")+"」のいずれかを入力してください。";
    }
    return '入力内容に不備があります。\n' + errorMessages.join("\n")+appendMessage;
  };

  const START_ROW_INDEX = 2;
  const END_ROW_INDEX = 10001;
  const START_COL_INDEX = 0;
  const END_COL_INDEX = COL_NAMES.length-1;
  const ERROR_MAX_COUNT = 10;
  const BREAK_EMPTY_ROW_COUNT = 3;
  let treeDatas=[];
  let insertedKeys=[];
  for (let i = 0; i <= END_COL_INDEX-START_COL_INDEX; i++) {
    treeDatas[i]=[];
    insertedKeys[i]=[];
  }
  let isEmptyRow, emptyRowCount=0, celldatas=[], errorMessages=[], hasKubunError=false;
  for (let rowIndex = START_ROW_INDEX; rowIndex <= END_ROW_INDEX; rowIndex++) {
    // 行のデータをすべて取得
    isEmptyRow = true;
    for (let colIndex = START_COL_INDEX; colIndex <= END_COL_INDEX; colIndex++) {
      let address = xlsx.utils.encode_cell({ r: rowIndex, c: colIndex });
      let cell = sheet[address];
      if (typeof cell === "undefined" || typeof cell.v === "undefined") {
        celldatas[colIndex] = "";
        continue;
      }
      // スペース判定
      let val = cell.v.trim();
      if(val === "" || val === "　") {
        celldatas[colIndex] = "";
        continue;
      }
      celldatas[colIndex] = val;
      isEmptyRow = false; 
    }
    // 空行判定 空行ならスキップ BREAK_EMPTY_ROW_COUNT回続いたら抜ける
    if(isEmptyRow) {
      emptyRowCount++;
      if(emptyRowCount===BREAK_EMPTY_ROW_COUNT) {
        break;
      }
      continue;
    }
    emptyRowCount = 0;
    
    // エラー判定　後方には値があるのに前方にない場合
    let isEmptyError = false;
    let hasEmpty = false;
    let emptyErrorColNames = [];
    for(let i=0; i<celldatas.length; i++){
      if(celldatas[i]===""){
        hasEmpty = true;
        emptyErrorColNames.push(COL_NAMES[i]);
      }else{
        if(hasEmpty){
          isEmptyError=true;
          break;
        }
      }
    }
    if(isEmptyError){
      if(EXPECTED!==null && celldatas[0]===""){
        hasKubunError=true;
      }
      errorMessages.push((rowIndex+1)+"行目: 『"+emptyErrorColNames.join("』『")+"』を入力してください。");
    // エラー判定　区分が規定値外
    }else if(EXPECTED.length>0 && EXPECTED.indexOf(celldatas[START_COL_INDEX]) === -1) {
      errorMessages.push((rowIndex+1)+"行目: 正しい写真区分を入力してください。");
      hasKubunError=true;
    }
    
    // エラー数が保持エラー件数に達していたらエラーメッセージを表示して終了
    if( errorMessages.length >= ERROR_MAX_COUNT ){
      await goyoDialog.showWarningMessageDialog(
        remote.getCurrentWindow(),
        '写真整理ツール',
        createErrorMessage(errorMessages, hasKubunError),
        'OK'
      );
      return;
    }
    
    let searchKey="";
    let parentKey="";
    let lastInsertIndex=0;
    for(let i=0; i<celldatas.length; i++){
      if( celldatas[i]==="" ){
        break;
      }
      searchKey = parentKey+"_"+celldatas[i];
      if(insertedKeys[i].indexOf(searchKey)===-1){
        let parent_i = lastInsertIndex;
        if(i>0){
          parent_i = insertedKeys[i-1].indexOf(parentKey);
        }
        treeDatas[i].push({
          name: celldatas[i],
          parent_i: parent_i,
          type: i+1,
          is_open: true,
          children: []
        });
        lastInsertIndex = treeDatas[i].length-1;
        insertedKeys[i].push(searchKey);
      }
      parentKey = searchKey;
    }
  }
  // エラーがある場合、エラーメッセージを表示して終了
  if( errorMessages.length > 0 ){
    await goyoDialog.showWarningMessageDialog(
      remote.getCurrentWindow(),
      '写真整理ツール',
      createErrorMessage(errorMessages, hasKubunError),
      'OK'
    );
    return;
  }
  // 写真整理ツリーに挿入する
  let tree;
  let treeId=2;
  let subTree=[];
  let lim = treeDatas.length-1;
  for(let i=lim; i>=1; i--){
    for(let j=0; j<treeDatas[i].length; j++){
      treeDatas[i-1][(treeDatas[i][j].parent_i)].children.push( treeDatas[i][j] );
    }
    treeDatas.pop();
  }
  
  //id降らないとDBに入らない
  let setupTreeId = ((treeDatas, id) =>{
    for(let i=0; i<treeDatas.length; i++){
      treeDatas[i].id = id++;
      delete treeDatas.parent_i;
      if( treeDatas[i].children.length>0 ){
        let res = setupTreeId(treeDatas[i].children, id);
        treeDatas[i].children = res[0];
        id = res[1];
      }
    }
    return [treeDatas, id];
  });
  let res = setupTreeId(treeDatas[0], 2);
  
  tree = [{
    "name": construction.constructionName,
    "id":1,
    "type": 0,
    "is_open": true,
    "children": res[0]
  }];

  photoInformationTree.updateCurrentTree(tree, construction.constructionId);
  syncDbWithRendererTree();
  return;
 });

$("#btnExit").on("click", async function(){
  window.close();
});

function syncDbWithRendererTree() {
  treeData = JSON.parse(photoInformationTree.getCurrentTree(true));
  $('#photoMngTree').tree('loadData', treeData);
}
function disableBookrackWindowSet() {
  let win = BookrackViewWindowSet.get();
  if (win) win.setEnable(false);
}

function enableBookrackWindowSet() {
  let win = BookrackViewWindowSet.get();
  if (win) win.setEnable(true);
}

$("input[name=inferenceRadio]").on("change", async function(){
  switch(this.id) {
    case "constructionList":
      refined = false;
      $("#btnMove").prop("disabled", false);
      $("#referenceTree").tree('setOption', "autoOpen", true);
      let data = JSON.parse(await photoInformationTree.getConstructions(construction.knack.knackId, construction.constructionId, true));
      $("#referenceTree").tree('destroy');
      await draw('#referenceTree', data, pattern, true, false, false);
      break;
    case "classification":
      refined = false;
      if((pattern === 1 && $("#photoMngTree").tree('getSelectedNode') === false) || 
          ($("#photoMngTree").tree('getSelectedNode') !== false && 
          pattern === 1 && 
          $("#photoMngTree").tree('getSelectedNode').getLevel() === 5)) {
        $("#btnMove").prop("disabled", true);
      } else {
        $("#btnMove").prop("disabled", false);
      }
      try {
        $("#referenceTree").tree('setOption', "autoOpen", true);
        $("#referenceTree").tree('destroy');
        await draw('#referenceTree', classificationData, pattern, true, false, false);
      } catch(e) {
        console.log(e);
      }
      break;
    case "constructionType":
      try {
        if (pattern !== 1 && pattern !== 3 && ($("#photoMngTree").tree('getSelectedNode').type !== 1 && construction.knack.knackType !== 3)) {
          $("#btnMove").prop("disabled", true);
        }
        $("#referenceTree").tree('setOption', "autoOpen", false);
        let firstLevelNode = getFirstLevelnode();
        
        $("#referenceTree").tree('destroy');
        await draw('#referenceTree', firstLevelNode, pattern, true, false, false);
      } catch(e) {
        console.log(e);
      }
      break;
  }
});

$("#rightButton").on("click", async function(){
  let searchText = $("#rightText").val();
  if(!searchText && !refined) {
    return;
  } else if(!searchText && refined) {
    refined = false;
    $("#referenceTree").tree('setOption', "autoOpen", false);
    $("#referenceTree").tree('setOption', "dragAndDrop", false);
    let firstLevelNode = getFirstLevelnode();
    
    $("#referenceTree").tree('loadData', firstLevelNode);
    $("#referenceTree").tree("reload");
    return;
  }

  let data = [];
  $("#referenceTree").tree('loadData', constructionTypeData);
  $.extend(true, data, constructionTypeData);
  await searchData(data, searchText);
  $("#referenceTree").tree('loadData', data);
  $("#referenceTree").tree("reload");
  refined = true;
});

function getFirstLevelnode() {
  let firstLevelNode = [];
  for(let node of constructionTypeData){
    let newNode = Object.assign({}, node);
    if(newNode.children.length > 0) {
      newNode.children = [{
        type: 99,
        name: "読み込み中…"
      }];
    }
    firstLevelNode.push(newNode);
  }
  return firstLevelNode;
}

async function searchData(data, searchText) {
  let nodeIdArray = [];
  searchTreeRecur(nodeIdArray ,data, searchText);
  deleteSearchResultRecur(nodeIdArray, data, searchText);
}

function searchTreeRecur(nodeIdArray, data, searchText) {
  for(let node of data) {
    if(nodeIdArray.indexOf(node.id) > -1) {
      continue;
    }
    if(node.name.includes(searchText)) {
      nodeIdArray.push(node.id);
      if(node.children.length > 0) {
        pushChildrenNodeId(node.children, nodeIdArray);
      }
      pushParentNode($('#referenceTree').tree('getNodeById', node.id), nodeIdArray)
    }
    if(node.children.length > 0) {
      searchTreeRecur(nodeIdArray, node.children, searchText);
    }
  }
}

function pushChildrenNodeId(node, nodeIdArray) {
  for(let child of node) {
    nodeIdArray.push(child.id);
    if(child.children.length > 0) {
      pushChildrenNodeId(child.children, nodeIdArray);
    }
  }
}

function pushParentNode(node, nodeIdArray) {
  if(node && node.parent.id) {
    nodeIdArray.push(node.parent.id);
    pushParentNode(node.parent, nodeIdArray);
  }
}

function deleteSearchResultRecur(nodeIdArray, data, searchText) {
  for(let index = data.length - 1; index >= 0; index--) {
    if(data[index].children.length > 0) {
      deleteSearchResultRecur(nodeIdArray, data[index].children, searchText);
      for(let child of data[index].children) {
        if(child.name.includes(searchText) || child.is_open === true) {
          data[index].is_open = true;
          break;
        }
      }
    } else {
      if(data[index].name.includes(searchText)) {
        data[index].is_open = true;
      }
    }
    if(nodeIdArray.indexOf(data[index].id) === -1) {
      delete data.splice(index, 1);
    }
  }
}