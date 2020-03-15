#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <codecvt>
#include "windows.h"

namespace native_ui {

using namespace v8;

#define RECAST(type) reinterpret_cast<type>
#define SCAST(type) static_cast<type>

typedef struct {
  double minMarginLeft;
  double minMarginTop;
  double paperWidth;
  double paperHeight;
  double printableWidth;
  double printableHeight;
  double offsetX;
  double offsetY;
} PrinterPaperInfoPrint;

void getDefaultPrintSetting(const FunctionCallbackInfo<Value> &info);
void getPrintDetail(const FunctionCallbackInfo<Value> &info);
void showPrintSetupDialog(const FunctionCallbackInfo<Value> &info);
PrinterPaperInfoPrint getPrinterInfoPrint(HDC &hdc);

/**
 * @fn
 * getPrinterInfoPrint
 * @brief get detail info print
 * @param hdc driver context
 * @return PrinterPaperInfoPrint structure
 */
PrinterPaperInfoPrint getPrinterInfoPrint(HDC &hdc) {
  PrinterPaperInfoPrint ppInfoPrint;
  const DWORD offsetX = GetDeviceCaps(hdc, PHYSICALOFFSETX);
  const DWORD offsetY = GetDeviceCaps(hdc, PHYSICALOFFSETY);
  const DWORD paperWidth = GetDeviceCaps(hdc, PHYSICALWIDTH);
  const DWORD paperHeight = GetDeviceCaps(hdc, PHYSICALHEIGHT);
  const DWORD printableWidth = GetDeviceCaps(hdc, HORZRES);
  const DWORD printableHeight = GetDeviceCaps(hdc, VERTRES);
  const DWORD dpiX = GetDeviceCaps(hdc, LOGPIXELSX);
  const DWORD dpiY = GetDeviceCaps(hdc, LOGPIXELSY);

#define I2MX(x) (std::round(x * 25.4 * 100 / dpiX)/100)
#define I2MY(y) (std::round(y * 25.4 * 100 / dpiY)/100)

  ppInfoPrint.minMarginLeft = I2MX(offsetX);
  ppInfoPrint.minMarginTop = I2MY(offsetY);
  ppInfoPrint.paperWidth = I2MX(paperWidth);
  ppInfoPrint.paperHeight = I2MY(paperHeight);
  ppInfoPrint.printableWidth = I2MX(printableWidth);
  ppInfoPrint.printableHeight = I2MY(printableHeight);
  ppInfoPrint.offsetX = I2MX(offsetX);
  ppInfoPrint.offsetY = I2MY(offsetY);

  return ppInfoPrint;
#undef I2MX
#undef I2MY
}

/**
 * @fn
 * ShowDialog
 * @brief show native print dialog
 * @param info is buffer
 * @return buffer
 */
void showPrintSetupDialog(const FunctionCallbackInfo<Value> &info) {
  const auto isolate = info.GetIsolate();
  HandleScope handleScope(isolate);

  HWND hwnd = nullptr;
  PRINTDLG pdx = {0};

  if (info.Length() < 2) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, "Wrong number of arguments.")));
    return;
  }

  if (!info[0]->IsNull()) {
    const auto bufferHWndData =
        RECAST(unsigned char *)(node::Buffer::Data(info[0]->ToObject()));
    const auto windowHandle = *RECAST(unsigned long *)(bufferHWndData);
    hwnd = RECAST(HWND)(windowHandle);
  }

  // Initialize the print dialog box's data structure.
  pdx.lStructSize = sizeof(pdx);
  pdx.Flags = PD_PRINTSETUP | PD_NONETWORKBUTTON;
  pdx.hwndOwner = hwnd;

  if (!info[1]->IsNull() && !info[2]->IsNull()) {
    const auto bufDevModeSize = node::Buffer::Length(info[1]->ToObject());
    pdx.hDevMode = GlobalAlloc(GHND, bufDevModeSize);
    const auto tmpDevMode = GlobalLock(pdx.hDevMode);
    const auto bufDevMode =
        SCAST(const char *)(node::Buffer::Data(info[1]->ToObject()));
    memcpy(tmpDevMode, bufDevMode, bufDevModeSize);

    const auto bufDevNameSize = node::Buffer::Length(info[2]->ToObject());
    pdx.hDevNames = GlobalAlloc(GHND, bufDevNameSize);
    const auto tmpDevName = GlobalLock(pdx.hDevNames);
    const auto bufDevName =
        SCAST(const char *)(node::Buffer::Data(info[2]->ToObject()));
    memcpy(tmpDevName, bufDevName, bufDevNameSize);
  }

  const bool printDlgCheck = PrintDlg(&pdx);
  GlobalUnlock(pdx.hDevMode);
  GlobalUnlock(pdx.hDevNames);

  if (printDlgCheck) {
    const auto pDevMode = (GlobalLock(pdx.hDevMode));
    const auto pDevNames = (GlobalLock(pdx.hDevNames));

    auto result = Object::New(isolate);
    result->Set(String::NewFromUtf8(isolate, "devmode"),
                node::Buffer::Copy(isolate, RECAST(const char *)(pDevMode),
                                   GlobalSize(pdx.hDevMode))
                    .ToLocalChecked());
    result->Set(String::NewFromUtf8(isolate, "devname"),
                node::Buffer::Copy(isolate, RECAST(const char *)(pDevNames),
                                   GlobalSize(pdx.hDevNames))
                    .ToLocalChecked());

    info.GetReturnValue().Set(result);

    GlobalUnlock(pdx.hDevMode);
    GlobalUnlock(pdx.hDevNames);
  } else {
    if (const auto ex = CommDlgExtendedError()) {
      char err[20];
      sprintf(err, "Error code - %lu", ex);
      isolate->ThrowException(
          Exception::TypeError(String::NewFromUtf8(isolate, err)));
    } else {
      info.GetReturnValue().Set(v8::Null(isolate));
    }
  }
  if (pdx.hDevMode != NULL) GlobalFree(pdx.hDevMode);
  if (pdx.hDevNames != NULL) GlobalFree(pdx.hDevNames);
  if (pdx.hDC != NULL) DeleteDC(pdx.hDC);
}

/**
 * @fn
 * getPrintDetail
 * @brief get info DEVMODE structure
 * @param info is buffer
 * @return buffer
 */
void getPrintDetail(const FunctionCallbackInfo<Value> &info) {
  const auto isolate = info.GetIsolate();
  HandleScope handleScope(isolate);

  if (info.Length() < 2) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, "Wrong number of arguments.")));
    return;
  }

  if (info[0]->IsUndefined()) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong arguments front register.")));
    return;
  }

  const auto bufDevMode =
      SCAST(const char *)(node::Buffer::Data(info[0]->ToObject()));
  const auto pDevMode = RECAST(const DEVMODE *)(bufDevMode);

  const auto bufDevName =
      SCAST(const char *)(node::Buffer::Data(info[1]->ToObject()));
  const auto pDevName = RECAST(const DEVNAMES *)(bufDevName);

  auto hPrinterDC = CreateDC(NULL, (LPCTSTR)pDevName + pDevName->wDeviceOffset,
                             NULL, pDevMode);
  if (hPrinterDC == NULL) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Creates a device context failed.")));
    return;
  }
  const auto infoPrint = getPrinterInfoPrint(hPrinterDC);
  if (hPrinterDC) DeleteDC(hPrinterDC);

  auto result = Object::New(isolate);
  result->Set(String::NewFromUtf8(isolate, "paperWidth"),
              Number::New(isolate, infoPrint.paperWidth));
  result->Set(String::NewFromUtf8(isolate, "paperHeight"),
              Number::New(isolate, infoPrint.paperHeight));
  result->Set(String::NewFromUtf8(isolate, "printableWidth"),
              Number::New(isolate, infoPrint.printableWidth));
  result->Set(String::NewFromUtf8(isolate, "printableHeight"),
              Number::New(isolate, infoPrint.printableHeight));
  result->Set(String::NewFromUtf8(isolate, "offsetX"),
              Number::New(isolate, infoPrint.offsetX));
  result->Set(String::NewFromUtf8(isolate, "offsetY"),
              Number::New(isolate, infoPrint.offsetY));
  std::string dmOrientation;
  if (pDevMode->dmOrientation == DMORIENT_PORTRAIT) {
    dmOrientation = "PORTRAIT";
  } else if (pDevMode->dmOrientation == DMORIENT_LANDSCAPE) {
    dmOrientation = "LANDSCAPE";
  }
  result->Set(String::NewFromUtf8(isolate, "paperSize"),
              Number::New(isolate, pDevMode->dmPaperSize));
  result->Set(String::NewFromUtf8(isolate, "orientation"),
              String::NewFromUtf8(isolate, dmOrientation.c_str()));
  std::string dmDuplex;
  switch (pDevMode->dmDuplex) {
    case DMDUP_SIMPLEX:
      dmDuplex = "SIMPLEX";
      break;
    case DMDUP_VERTICAL:
      dmDuplex = "DUPLEX_VERTICAL";
      break;
    case DMDUP_HORIZONTAL:
      dmDuplex = "DUPLEX_HORIZONTAL";
      break;
    default:;
  }
  result->Set(String::NewFromUtf8(isolate, "duplexMode"),
              String::NewFromUtf8(isolate, dmDuplex.c_str()));
  const auto printerName = RECAST(LPCWSTR)(pDevName) + pDevName->wDeviceOffset;
  result->Set(
      String::NewFromUtf8(isolate, "deviceName"),
      String::NewFromTwoByte(isolate, RECAST(const uint16_t *)(printerName)));

  info.GetReturnValue().Set(result);
}

/**
 * @fn
 * getDefaultPrintSetting
 * @brief get default print setting
 * @param info is buffer
 * @return array buffer
 */
void getDefaultPrintSetting(const FunctionCallbackInfo<Value> &info) {
  const auto isolate = info.GetIsolate();
  HandleScope handleScope(isolate);

  PRINTDLG pdx = {0};

  // Initialize the print dialog box's data structure.
  pdx.lStructSize = sizeof(pdx);
  pdx.Flags = PD_RETURNDEFAULT;
  pdx.hDevMode = nullptr;
  pdx.hDC = nullptr;

  if (PrintDlg(&pdx)) {
    const auto pDevMode = (GlobalLock(pdx.hDevMode));
    const auto pDevNames = (GlobalLock(pdx.hDevNames));

    auto result = Object::New(isolate);
    result->Set(String::NewFromUtf8(isolate, "devmode"),
                node::Buffer::Copy(isolate, RECAST(const char *)(pDevMode),
                                   GlobalSize(pdx.hDevMode))
                    .ToLocalChecked());
    result->Set(String::NewFromUtf8(isolate, "devname"),
                node::Buffer::Copy(isolate, RECAST(const char *)(pDevNames),
                                   GlobalSize(pdx.hDevNames))
                    .ToLocalChecked());

    info.GetReturnValue().Set(result);

    GlobalUnlock(pdx.hDevMode);
    GlobalUnlock(pdx.hDevNames);
  } else {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Get default print setting failes")));
  }

  if (pdx.hDevMode != NULL) GlobalFree(pdx.hDevMode);
  if (pdx.hDevNames != NULL) GlobalFree(pdx.hDevNames);
  if (pdx.hDC != NULL) DeleteDC(pdx.hDC);
}

/**
 * @fn
 * init
 * @brief Init Nan function
 * @return void
 */
void Init(const Local<Object> exports) {
  NODE_SET_METHOD(exports, "showPrintSetupDialog", showPrintSetupDialog);
  NODE_SET_METHOD(exports, "getPrintDetail", getPrintDetail);
  NODE_SET_METHOD(exports, "getDefaultPrintSetting", getDefaultPrintSetting);
}

#undef SCAST
#undef RECAST

NODE_MODULE(NODE_GYP_MODULE_NAME, Init)

}
