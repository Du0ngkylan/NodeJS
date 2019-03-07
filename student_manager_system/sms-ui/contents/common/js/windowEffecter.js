(function(){
  const { ipcRenderer, } = require('electron');
  ipcRenderer.on('disableWaitEffect', (event, from='') => {
    windowEffecter.disableWaitEffect();
    if (windowEffecter.logger) windowEffecter.logger.debug(`event 'disableWaiteffect' from ${from}`);
  });
  ipcRenderer.on('enableWaitEffect', (event, from='') => {
    windowEffecter.enableWaitEffect();
    if (windowEffecter.logger) windowEffecter.logger.debug(`event 'enableWaitEffect' from ${from}`);
  });
})();
const windowEffecter = {
  //public
  logger:null,
  //private
  __isShowErrorMessage:false,
  __remote: null,
  __goyoDialog:null,
  __viewMode:null,
  __BrowserWindow:null, 
  __execFile:null,
  __win:null,
  __isLoaded:null,
  __waitDiv:null,
  countEffect: 0,
  GOYO_WAIT_EFFECT_CSS : 
    `cursor: wait !important;
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
    z-index: 1000;`,
  GOYO_WAIT_EFFECT_TAG : 'goyoWaitEffect',
  __cursorWaitDiv:null,
  //public
  async initialize(){
    this.__remote        = require('electron').remote;
    this.__BrowserWindow = this.__remote.require('electron').BrowserWindow;
    this.logger = this.__remote.require('./lib/goyo-log')('check-NetworkConstruction');  
    this.__win = this.__remote.getCurrentWindow();
    this.__waitDiv = null;

    if(!window.logger){//check global logger
      window.logger = this.logger;
    }
  },
  hideWindow(){
    this.__win.setOpacity(0);
  },
  showWindow(){
    this.__win.setOpacity(1);
  },
  async loadingWindow(){
    if(!(this.__waitDiv)){
      if(document.readyState === "loading"){
        document.addEventListener('DOMContentLoaded',()=>{
          this.__setupLoadingWindow();
        })    
      }else{
        this.__setupLoadingWindow();
      }
      if(this.__isLoaded){
        this.loadedWindow();
        this.__isLoaded = false;
      }
    }
  },
  async loadedWindow(){
    this.__isLoaded = true;
    if(this.__waitDiv){
      this.__waitDiv.parentNode.removeChild(this.__waitDiv);
      this.__waitDiv = null;
      this.__isLoaded = null;
      this.__enableUserInputAction();
    }
  },
  showLoadingWindowIfTrueCallback(callback= ()=>{false}){
    if(callback()){
      this.loadingWindow();
    }
  },
  hideLoadingWindowIfTrueCallback(callback= ()=>{false}){
    if(callback()){
      this.loadedWindow();
    }
  },
  disableWaitEffect(){
    if (this.countEffect===0) {
      this.__cursorWait();
    }
    this.countEffect++;
  },
  enableWaitEffect(){
    if (this.countEffect > 0) {
      this.countEffect--;
      if (this.countEffect===0) {
        this.__revertCursor()
      }
    }
  },
  //private
  __cursorWait(){
    if (!this.__cursorWaitDiv) {
      this.__cursorWaitDiv = document.createElement("div");
      this.__cursorWaitDiv.style.cssText  = this.GOYO_WAIT_EFFECT_CSS;
    }
    this.__addDisableEvents();
    document.body.appendChild(this.__cursorWaitDiv)
  },
  __revertCursor(){
    document.body.removeChild(this.__cursorWaitDiv)
    this.__enableUserInputAction();
  },
  __setupLoadingWindow(){
    this.__makeLoader();
    this.__spinnerSetPotion();
    this.__resizeEventForPhotoView();
    this.__disableUserInputAction();
  },
  __disabler(e) {
    e.stopPropagation();
    e.preventDefault();
  },
  __addDisableEvents(){
    window.addEventListener('wheel', this.__disabler, true);
    window.addEventListener('contextmenu', this.__disabler, true);
    window.addEventListener('keydown', this.__disabler, true);
  },
  __disableUserInputAction(){
    if (this.__waitDiv) {
      this.__addDisableEvents();
      document.body.appendChild(this.__waitDiv);
    }
  },
  __enableUserInputAction(){
    window.removeEventListener('wheel', this.__disabler, true);
    window.removeEventListener('contextmenu', this.__disabler, true);
    window.removeEventListener('keydown', this.__disabler, true);
  },
  __makeLoader(){
    this.__waitDiv = document.createElement("div");
    this.__waitDiv.id = "networkConstructionLoader";
    this.__waitDiv.innerHTML = 
    `<div class="fl spinner2">
      <div id="spin">
        <div class="spinner-container container1">
          <div class="circle1"></div>
          <div class="circle2"></div>
          <div class="circle3"></div>
          <div class="circle4"></div>
        </div>
        <div class="spinner-container container2">
          <div class="circle1"></div>
          <div class="circle2"></div>
          <div class="circle3"></div>
          <div class="circle4"></div>
        </div>
        <div class="spinner-container container3">
          <div class="circle1"></div>
          <div class="circle2"></div>
          <div class="circle3"></div>
          <div class="circle4"></div>
        </div>
      </div>
      <div id="networkLoadMessageSection">
        <p id="networkLoadMessage">読み込んでいます</p>
      </div>
    </div>`
    document.body.appendChild(this.__waitDiv);
  },
  __resizeEventForPhotoView(){
    var timer = 0;
    window.addEventListener('resize',()=>{
      if (timer > 0) {
        clearTimeout(timer);
      }
      timer = setTimeout(()=>{
        this.__spinnerSetPotion();
      }, 100);
    });
  },
  __makeLoader(){
    this.__waitDiv = document.createElement("div");
    this.__waitDiv.id = "networkConstructionLoader";
    this.__waitDiv.innerHTML = 
    `<div class="fl spinner2">
      <div id="spin">
        <div class="spinner-container container1">
          <div class="circle1"></div>
          <div class="circle2"></div>
          <div class="circle3"></div>
          <div class="circle4"></div>
        </div>
        <div class="spinner-container container2">
          <div class="circle1"></div>
          <div class="circle2"></div>
          <div class="circle3"></div>
          <div class="circle4"></div>
        </div>
        <div class="spinner-container container3">
          <div class="circle1"></div>
          <div class="circle2"></div>
          <div class="circle3"></div>
          <div class="circle4"></div>
        </div>
      </div>
      <div id="networkLoadMessageSection">
        <p id="networkLoadMessage">読み込んでいます</p>
      </div>
    </div>`
    document.body.appendChild(this.__waitDiv);
  },
  __spinnerSetPotion(){
    let elmfl = document.getElementsByClassName('fl')[0];
    if(elmfl){
      let flLeft = window.innerWidth / 2 - elmfl.offsetWidth / 2;
      let flTop = window.innerHeight /2 - elmfl.offsetHeight / 2;
      let flCss = `position: absolute;
      left: ${flLeft}px;
      top: ${flTop}px;`
      elmfl.style.cssText = flCss;
    }
  },
}