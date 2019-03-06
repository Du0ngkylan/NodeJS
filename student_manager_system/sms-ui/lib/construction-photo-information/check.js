'use strict';

const KUBUN_LIST_A = [
  '着手前及び完成写真',
  '施工状況写真',
  '安全管理写真',
  '使用材料写真',
  //'品質管理写真',
  //'出来形管理写真',
  '災害写真',
  '事故写真',
  'その他',
];

const KUBUN_LIST_B = [
  '着手前写真',
  '施工状況写真',
  '検査写真',
  '安全管理写真',
  '完成写真',
  '災害写真',
  'その他写真',
];

const CHECKER_FUNCTIONS = {
  '511': patternA,    // 国交省 設計 H28.3       
  '16': patternA,     // 国交省 設計 H20.5       
  '521': patternA,    // 国交省 設計 電気 H28.3  
  '17': patternA,     // 国交省 設計 電気 H22.9  
  '531': patternA,    // 国交省 設計 機械 H28.3  
  '18': patternA,     // 国交省 設計 機械 H24.12 
  '561': patternA,    // 国交省 工事 H28.3       
  '26': patternA,     // 国交省 工事 H22.9       
  '571': patternA,    // 国交省 工事 電気 H28.3  
  '27': patternA,     // 国交省 工事 電気 H22.9  
  '581': patternA,    // 国交省 工事 機械 H28.3  
  '29': patternA,     // 国交省 工事 機械 H24.12 
  '802': patternB,    // NEXCO H29.7             
  '801': patternB,    // NEXCO H28.7             
  '90': patternB,     // NEXCO H24.7             
  '80': patternA,     // 農水省 設計 H23.3       
  '82': patternA,     // 農水省 設計 電気 H25.3  
  '83': patternA,     // 農水省 設計 機械 H26.3  
  '15': patternA,     // 農水省 設計 機械 H19.4  
  '81': patternA,     // 農水省 工事 H23.3       
  '74': patternA,     // 農水省 工事 電気 H17.4  
  '62': patternA,     // 農水省 工事 機械 H19.4  
  '70': patternA,     // 農水省 設計 H17.4       
  '71': patternA,     // 農水省 設計 電気 H17.4  
  '73': patternA,     // 農水省 工事 H17.4       
  '304': patternC,    // 首都高 工事 H23.3       
  '301': patternC,    // 首都高 設計 H23.3       
  '305': patternD,    // 首都高 工事 電気 H23.3  
  '306': patternD,    // 首都高 工事 機械 H23.3  
  '302': patternD,    // 首都高 設計 電気 H23.3  
  '303': patternD,    // 首都高 設計 機械 H23.3  
  '31': () => false,   // 国交省 営繕 H28         
  '9': () => false,    // 一般建築                
  '76': () => false,   // 一般土木 のみ           
};

function patternA(cpi) {
  return isEmpty(cpi['写真タイトル']) ||
    isEmpty(cpi['写真-大分類']) ||
    isEmpty(cpi['撮影年月日']) ||
    (cpi['写真-大分類']==='工事' && KUBUN_LIST_A.findIndex(r => r===cpi['写真区分'])===-1);
}

function patternB(cpi) {
  return isEmpty(cpi['写真タイトル']) ||
    (cpi['写真-大分類']!=='工事') ||
    isEmpty(cpi['撮影年月日']) ||
    (KUBUN_LIST_B.findIndex(r => r===cpi['写真区分'])===-1);
}

function patternC(cpi) {
  return isEmpty(cpi['写真-大分類']) || isEmpty(cpi['撮影年月日']);
}

function patternD(cpi) {
  return isEmpty(cpi['写真-大分類']);
}

function isEmpty(v) {
  return typeof v !== 'string' || v === '';
}

module.exports = {
  getPhotoInformationChecker(knack) {
    let checker = CHECKER_FUNCTIONS[String(knack.knackId)];
    if (checker) {
      return (cpi) => {
        if (cpi.hasOwnProperty('参考図情報')) {
          return true;
        } else if (cpi.hasOwnProperty('写真情報')) {
          return !checker(cpi['写真情報']);
        } else {
          return true;
        }
      };
    } else {
      return () => true;
    }
  },
};

