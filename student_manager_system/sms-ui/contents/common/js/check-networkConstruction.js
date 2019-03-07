const checkNetworkConstruction = {
  //private
  __isNetworkConstruction:null,
  __constructionId:null,
  __constructionDataPath:null,
  __isShowErrorMessage:false,
  __checkSpanTime: 10,//sec
  __remote: null,
  __goyoDialog:null,
  __viewMode:null,
  __BrowserWindow:null, 
  __logger:null,
  __execFile:null,
  __win:null,
  __waitDiv:null,
  //public
  async initialize(constructionId = null,constructionDatePath = '',disableProgressWindow = false){
    try{
      this.__remote        = require('electron').remote;
      this.__BrowserWindow = this.__remote.require('electron').BrowserWindow;
      this.__goyoDialog = this.__remote.require('./lib/goyo-dialog-utils');
      this.__viewMode   = this.__remote.require('./lib/goyo-window-controller').viewMode;
      const bookrackAccessor = this.__remote.require('goyo-bookrack-accessor');
      this.__logger = this.__remote.require('./lib/goyo-log')('check-NetworkConstruction');  
      this.__execFile = require('child_process').execFile;
      this.__win = this.__remote.getCurrentWindow()
      this.__constructionDataPath = constructionDatePath;
      this.__constructionId = constructionId;
      
      if(!window.logger){//check global logger
        window.logger = this.__logger;
      }
      if(!constructionId && !constructionDatePath){
        logger.errror('check-NetworkConstruction|no args');
        throw error('no args');
      }
      if(!constructionDatePath){
        const ctx = 
          (await bookrackAccessor.getConstructionDetail(constructionId)).construction;
        this.__constructionDataPath = ctx.dataFolder;
      }
      this.__isNetworkConstruction = 
        await this.__isNetworkConstructionFunc(this.__constructionDataPath);
      if(this.__isNetworkConstruction){
        if(!navigator.onLine){
          await this.__showErrorMessage();
          return;
        }
        this.addEventOfflineCase();
        this.intervalCheckNetworkStatus();
      }
      return true;
    } catch (e) {
      logger.error(e);
    }
  },
  addEventOfflineCase(){
    window.addEventListener('focus',async ()=>{
      if(!navigator.onLine){
        await this.__showErrorMessage();
        return;
      }
      window.addEventListener('offline',this.__listener);
    });
    window.addEventListener('blur',()=>{
      window.removeEventListener('offline',this.__listener);
    });
  },
  intervalCheckNetworkStatus(){
    window.addEventListener('focus',async ()=>{
      if(!this.__checkFunction){
        this.__checkFunction = setInterval(this.__checkPathExists,this.__checkSpanTime*1000);
      }
    });
    window.addEventListener('blur',()=>{
      clearInterval(this.__checkFunction);
      this.__checkFunction = null;
    });
  },
  isNetworkConstruction(){
    return this.__isNetworkConstruction;
  },
  async checkThenShowConsturctionList(){
    let isShow = !(navigator.onLine);
    // let isShow = !(await this.__isPathExists());
    if(isShow){
      await this.__showErrorMessage();
    }
    return isShow;
  },
  //private
  async __listener(){
    await checkNetworkConstruction.__showErrorMessage();
  },
  async __checkPathExists(){
    try {
      if(!await checkNetworkConstruction.__isPathExists()){
        await checkNetworkConstruction.__showErrorMessage();
      }    
    } catch (e) {
      logger.error(e);
    }
  },
  __isPathExists(){
    const fs = require('fs');
    return new Promise((resolve,reject)=>{
      try {
        fs.stat(checkNetworkConstruction.__constructionDataPath,(err,stat)=>{
          if(err){
            resolve(false);
            return
          }
          resolve(true);
        })
      } catch (e) {
				logger.error(e);
        resolve(false)
      }
    })  
  },
  async __showErrorMessage(){
    const goyoDialog   = checkNetworkConstruction.__goyoDialog;
    const browserWindow = checkNetworkConstruction.__BrowserWindow;
    if(!this.__isShowErrorMessage){
      this.__isShowErrorMessage = true;
      await goyoDialog.showErrorMessageDialog(browserWindow.getFocusedWindow(),//window,//checkNetworkConstruction.__remote.getCurrentWindow(),
                                            'エラー','共有工事にアクセスできません。工事一覧に戻ります。','OK');
      checkNetworkConstruction.__showConstructionList();
    }
  },
  __showConstructionList(){
    const viewMode  = checkNetworkConstruction.__viewMode;
    viewMode.setNextMode(
      viewMode.MODE_CONSTRUCTION_SELECTION,
      { selectionMode: 'normal', 
      defaultConstructionId: checkNetworkConstruction.__constructionId });
    viewMode.closeCurrentModeWindow();
    },
  async __isNetworkConstructionFunc(dataFolderPath){
    const exceFile = this.__execFile;
    function getLocalDrive(){
      return new Promise((resolve,reject)=>{
          let wmicArgs   = ['logicaldisk','Where','DriveType=3','get', 'DeviceID'];
          exceFile("wmic", wmicArgs,(error,stdout,stderr)=>{
          if(error){
            reject(error);
          }
          if(stderr){
            reject(error)
          }
          let pathList = stdout.split(/\s*[\n\r]+/g);
          pathList.splice(0, 1);
          pathList = pathList.filter((val)=> val);
          resolve(pathList)
        })
      })
    }
    function checkNetworkFolder(dataPath,LocalDriveList) {
      if(dataPath.substr(0,2) === '\\\\'){
        return true
      }
      for(let localDrivePath of LocalDriveList){
        let dataPathDrive = dataPath.substr(0,localDrivePath.length)
        if(localDrivePath === dataPathDrive){
          return false;
        }
      }
      return true
    }
    let LocalDriveList = await getLocalDrive();
    return checkNetworkFolder(dataFolderPath,LocalDriveList);
  }
}