'use strict';

const TEXT_FORMAT_REGEX = /{{[^\n\t\v{}]*}}/g;

class TextFrameFormatter {
  constructor(albumInfoManager, makePhotoInfoText) {
    this._albumInfoManager = albumInfoManager;
    this._makePhotoInfoText = makePhotoInfoText;
  }

  _formatAlbumInfoText(key, spreadIndex) {
    if (!this._albumInfoManager) return null;

    switch (key) {
      case 'album.constructionname':
        return this._albumInfoManager.constructionName;
      case 'album.albumname':
        return this._albumInfoManager.albumName;
      case 'album.pagenum_left':
        {
          return `${2*spreadIndex+1}`;
          let nonble = this._albumInfoManager.nonble;
          if (nonble.enable) {
            let page = nonble.start + nonble.offset + 2*spreadIndex+0;
            return `${nonble.prefix}${page}`;
          } else {
            return '';
          }
        }
      case 'album.pagenum_right':
        {
          return `${2*spreadIndex+2}`;
          let nonble = this._albumInfoManager.nonble;
          if (nonble.enable) {
            let page = nonble.start + nonble.offset + 2*spreadIndex+1;
            return `${nonble.prefix}${page}`;
          } else {
            return '';
          }
        }
      case 'album.leftTop':
        return this._albumInfoManager.headers.left;
      case 'album.centerTop':
        return this._albumInfoManager.headers.center;
      case 'album.rightTop':
        return this._albumInfoManager.headers.right;
      case 'album.leftBottom':
        return this._albumInfoManager.footers.left;
      case 'album.centerBottom':
        return this._albumInfoManager.footers.center;
      case 'album.rightBottom':
        return this._albumInfoManager.footers.right;
      default:
        return "";
        break;
    }
  }

  _formatKokubanText(textFrames, key) {
    if (textFrames && textFrames.hasOwnProperty(key)) {
      return textFrames[key].fieldValue;
    } else {
      return null;
    }
  }

  format(textFormat, frameInfo, spreadIndex) {
    let result = textFormat.replace(TEXT_FORMAT_REGEX, (match) => {
      let formatKies = match
        .replace('{{', '')
        .replace('}}', '')
        .replace(/\s/, '')
        .split('|');

      for (let key of formatKies) {
        if (key === 'goyo.photoinfotext') {
          if (frameInfo && frameInfo.constructionPhotoInformation && this._makePhotoInfoText) {
            return this._makePhotoInfoText(frameInfo.constructionPhotoInformation);
          }
        } else if (key === 'goyo.photofilename') {
          if (frameInfo && frameInfo.photoFrames.length > 0) {
            return frameInfo.photoFrames[0].fileArias;
          } else {
            return '';
          }
        } else if (key.startsWith('album.')) {
          let r = this._formatAlbumInfoText(key, spreadIndex);
          if (r != null) {
            return r;
          }
        } else if (key.startsWith('kokuban.')) {
          if (frameInfo) {
            let r = this._formatKokubanText(frameInfo.textFrames, key);
            if (r != null) {
              return r;
            }
          }
        } else {}
      }
      return '';
    });
    return result;
  }
}

module.exports = {
  TextFrameFormatter,
};
