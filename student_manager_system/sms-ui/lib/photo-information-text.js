'use strict';

const path = require('path');

function getTextKeyOnly(useLabel, cpi, key) {
  if (cpi[key] == 1) {
    if (useLabel) {
      return `【${key}】`;
    } else {
      return `${key}`;
    }
  } else {
    return null;
  }
}

function getTextKeyValue(useLabel, cpi, key) {
  if (cpi[key] != null && cpi[key] !== '') {
    if (useLabel) {
      return `【${key}】${cpi[key]}`;
    } else {
      return `${cpi[key]}`;
    }
  } else {
    return null;
  }
}

function getTextKeyValueLabel(cpi, label, key) {
  if (cpi[key] != null && cpi[key] !== '') {
    if (label) {
      return `【${label}】${cpi[key]}`;
    } else {
      return `${cpi[key]}`;
    }
  } else {
    return null;
  }
}

function getReferenceListText(useLabel, cpi) {
  let files = [];

  for (let ref of (cpi['参考図'] || [])) {
    if (ref['参考図エイリアス']) {
      files.push(ref['参考図エイリアス']);
    }
  }

  for (let ref of (cpi['参考図情報'] || [])) {
    if (ref['参考図ファイル名']) {
      files.push(path.basename(ref['参考図ファイル名']));
    }
  }

  if (files.length > 0) {
    let filenames = files.join('\n  ');
    if (useLabel) {
      return `【参考図】\n  ${filenames}`;
    } else {
      return `  ${filenames}`;
    }
  } else {
    return null;
  }
}

function getOtherPhotoFileNames(cpi){
  let names = '';
  if (cpi['参考図情報'].hasOwnProperty('参照元フレーム') 
  &&  Array.isArray(cpi['参考図情報']['参照元フレーム'])) {
    for (let n of cpi['参考図情報']['参照元フレーム']) {
      if (n.hasOwnProperty('写真ファイル名')) {
        names += `\n${n['写真ファイル名']}`;
      }
    }
  }
  return names;
}

const NORMAL_TABLE = [
  {
    id: "isRepresentative",
    getText(useLabel, cpi) { return getTextKeyOnly(useLabel, cpi['写真情報'], '代表写真'); }
  },
  {
    id: "isFrequencyOfSubmission",
    getText(useLabel, cpi) { return getTextKeyOnly(useLabel, cpi['写真情報'], '提出頻度写真'); }
  },
  {
    id: "title",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '写真タイトル'); }
  },
  {
    id: "largeClassification",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '写真-大分類'); }
  },
  {
    id: "photoClassification",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '写真区分'); }
  },
  {
    id: "constructionType",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '工種'); }
  },
  {
    id: "middleClassification",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '種別'); }
  },
  {
    id: "smallClassification",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '細別'); }
  },
  {
    id: "classificationRemarks",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '工種区分予備'); }
  },
  {
    id: "dateOfShooting",
    getText(useLabel, cpi) {
      let v = getTextKeyValue(useLabel, cpi['写真情報'], '撮影年月日');
      if (typeof v === 'string') return v.replace(/-/g, '')
      else return v;
    }
  },
  {
    id: "shootingSpot",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '撮影箇所'); }
  },
  {
    id: "spareOfShooting",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '撮影情報予備'); }
  },
  {
    id: "measurements",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '施工管理値'); }
  },
  {
    id: "remarks",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '施工管理値予備'); }
  },
  {
    id: "spareOfSituationExplanation",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '状況説明予備'); }
  },
  {
    id: "contractorRemarks",
    getText(useLabel, cpi) { return getTextKeyValueLabel(cpi['写真情報'], useLabel?'請負者説明文':null, '請負者説明文'); }
  },
  {
    id: "contractorRemarks_",
    getText(useLabel, cpi) { return getTextKeyValueLabel(cpi['写真情報'], useLabel?'受注者説明文':null, '請負者説明文'); }
  },
  {
    id: "spareOfPhotoInformation",
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['写真情報'], '写真情報予備'); }
  },
  {
    id: "referenceFigureFile",
    getText(useLabel, cpi, tags) { return getReferenceListText(useLabel, cpi['写真情報']); }
  },
];

const EIZEN_TABLE = [
  {
    id: 'isRepresentative',
    getText(useLabel, cpi) { return getTextKeyValueLabel(cpi['写真情報'], useLabel?'工事種目':null, '写真-大分類'); }
  },
  {
    id: 'title',
    getText(useLabel, cpi) { return getTextKeyValueLabel(cpi['写真情報'], useLabel?'施工状況':null, '写真区分'); }
  },
  {
    id: 'largeClassification',
    getText(useLabel, cpi) { return getTextKeyValueLabel(cpi['写真情報'], useLabel?'詳細':null, '工種'); }
  },
  {
    id: 'middleClassification',
    getText(useLabel, cpi) { return getTextKeyValueLabel(cpi['写真情報'], useLabel?'メモ１':null, 'メモ１'); }
  },
  {
    id: 'smallClassification',
    getText(useLabel, cpi) { return getTextKeyValueLabel(cpi['写真情報'], useLabel?'メモ２':null, 'メモ２'); }
  },
  {
    id: "classificationRemarks",
    getText(useLabel, cpi, tags) { return getReferenceListText(useLabel, cpi['写真情報']); }
  },
];

const EIZEN_REFENRECE_TABLE = [
  {
    id: 'dateOfShooting',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], 'メモ１'); }
  },
  {
    id: 'shootingSpot',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], 'メモ２'); }
  },
  {
    id: 'spareOfShooting',
    getText(useLabel, cpi) {
      let names = getOtherPhotoFileNames(cpi);
      return getTextKeyValueLabel(cpi['参考図情報'], '参考図を登録した写真', '写真ファイル名') + names;
    }
  },
];

const IPPANKENCHIKU_TABLE = [
  {
    id: 'isRepresentative',
    getText(useLabel, cpi, tags) { return getTextKeyValueLabel(cpi['写真情報'], tags[0], '写真-大分類'); }
  },
  {
    id: 'title',
    getText(useLabel, cpi, tags) { return getTextKeyValueLabel(cpi['写真情報'], tags[1], '写真区分'); }
  },
  {
    id: 'largeClassification',
    getText(useLabel, cpi, tags) { return getTextKeyValueLabel(cpi['写真情報'], tags[2], '工種'); }
  },
  {
    id: 'photoClassification',
    getText(useLabel, cpi, tags) { return getTextKeyValueLabel(cpi['写真情報'], tags[3], '種別'); }
  },
  {
    id: 'constructionType',
    getText(useLabel, cpi, tags) { return getTextKeyValueLabel(cpi['写真情報'], tags[4], '細別'); }
  },
  {
    id: 'middleClassification',
    getText(useLabel, cpi, tags) { return getTextKeyValueLabel(cpi['写真情報'], tags[5], 'メモ１'); }
  },
  {
    id: 'smallClassification',
    getText(useLabel, cpi, tags) { return getTextKeyValueLabel(cpi['写真情報'], tags[6], 'メモ２'); }
  },
  {
    id: "spareOfShooting",
    getText(useLabel, cpi, tags) { return getReferenceListText(useLabel, cpi['写真情報']); }
  },
];

const IPPANKENCHIKU_REFENRECE_TABLE = [
  {
    id: 'classificationRemarks',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], '参考図タイトル'); }
  },
  {
    id: 'dateOfShooting',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], '付加情報予備'); }
  },
  {
    id: 'shootingSpot',
    getText(useLabel, cpi) {
      let names = getOtherPhotoFileNames(cpi);
      return getTextKeyValueLabel(cpi['参考図情報'], '参考図を登録した写真', '写真ファイル名') + names;
    }
  },
];

const REFENRECE_TABLE = [
  {
    id: 'title',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], '参考図タイトル'); }
  },
  {
    id: 'spareOfAdditionalInformation',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], '付加情報予備'); }
  },
  {
    id: 'refMemo2',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], 'メモ１'); }
  },
  {
    id: 'refMemo2',
    getText(useLabel, cpi) { return getTextKeyValue(useLabel, cpi['参考図情報'], 'メモ２'); }
  },
  {
    id: 'photoFile',
    getText(useLabel, cpi) {
      let names = getOtherPhotoFileNames(cpi);
      return getTextKeyValueLabel(cpi['参考図情報'], '参考図を登録した写真', '写真ファイル名') + names;
    }
  },
];


class PhotoInformationMaker {
  constructor(useLabel, table, rtable) {
    this.useLabel = useLabel;
    this.table = table;
    this.rtable = rtable;
  }

  make(cpi) {
    if (cpi.hasOwnProperty('写真情報')) {
      return this.makeNonReferencePhotoInformation(cpi);
    } else if (cpi.hasOwnProperty('参考図情報')) { 
      return this.makeReferencePhotoInformation(cpi);
    } else {
      return "";
    }
  }

  makeNonReferencePhotoInformation(cpi) {
    let textList = [];

    for (let item of this.table) {
      textList.push(item.getText(this.useLabel, cpi));
    }

    return textList.filter(t => t!=null).join('\n');
  }

  makeReferencePhotoInformation(cpi) {
    let textList = [];

    for (let item of this.rtable) {
      textList.push(item.getText(this.useLabel, cpi));
    }

    return textList.filter(t => t!=null).join('\n');
  }
};


class IppanKenchikuPhotoInformationMaker extends PhotoInformationMaker {
  constructor(useLabel, rf, dp, tags) {
    super(
      useLabel,
      IPPANKENCHIKU_TABLE.filter(item => dp[item.id]===1),
      IPPANKENCHIKU_REFENRECE_TABLE.filter(item => dp[item.id]===1)
    );
    this.tags = tags;
  }

  makeNonReferencePhotoInformation(cpi) {
    let textList = [];

    for (let item of this.table) {
      textList.push(item.getText(this.useLabel, cpi, this.tags));
    }

    return textList.filter(t => t!=null).join('\n');
  }
}

function generatePhotoInformationMaker(knack, constructionPhoto, photoInformationTags) {
  let knackType = knack.knackType;
  let dp = Object.assign({}, constructionPhoto.displayPhoto);
  let rf = constructionPhoto.referenceFigure;
  let useLabel = constructionPhoto.informationName == 0;

  if (knackType === 9) {
    return new IppanKenchikuPhotoInformationMaker(useLabel, rf, dp, photoInformationTags);
  } else if (knackType === 3) {
    return new PhotoInformationMaker(
      useLabel,
      EIZEN_TABLE.filter(item => dp[item.id]===1),
      EIZEN_REFENRECE_TABLE.filter(item => dp[item.id]===1)
    );
  } else {
    if ((knackType === 1 || knackType === 2 || knackType === 6) && dp['contractorRemarks']==1) {
      dp['contractorRemarks'] = 0;
      dp['contractorRemarks_'] = 1;
    }
    return new PhotoInformationMaker(
      useLabel,
      NORMAL_TABLE.filter(item => dp[item.id]===1),
      REFENRECE_TABLE.filter(item => rf[item.id]===1)
    );
  }
}


module.exports = {
  generatePhotoInformationMaker,
};

