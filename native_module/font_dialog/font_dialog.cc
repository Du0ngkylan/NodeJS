#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <windows.h>
#include <chrono>
#include <string>
#include <sstream>
#include <iomanip>

using namespace v8;

#define RECAST(type) reinterpret_cast<type>
#define SCAST(type) static_cast<type>

namespace native_ui {

static CHOOSEFONT cf = {0};
static LOGFONT lfont = {0};
HWND hwnd;

using namespace std;

/**
 * @fn
 * HexString
 * @param(data) byte array
 * @param(len) byte length
 * @brief convert hex string
 * @return hex string
 */
static inline string HexString(unsigned char *data, int len) {
  stringstream ss;
  ss << hex;
  for (int i = 0; i < len; ++i) {
    ss << setw(2) << setfill('0') << (int)data[i];
  }
  return ss.str();
}

/**
 * @fn
 * ConvertColorRef
 * @brief convert color string
 * @param (color_ref) color reference
 * @return color hex string
 */
static inline string ConvertColorRef(COLORREF &color_ref) {
  // COLORREF ref = RGB(red, green, blue);
  unsigned char b[3];
  b[0] = GetRValue(color_ref);
  b[1] = GetGValue(color_ref);
  b[2] = GetBValue(color_ref);
  string hex = "#" + HexString(b, 3);
  return hex;
}

/**
 * @fn
 * ShowDialog
 * @brief show native font dialog
 * @param info is buffer
 * @return buffer
 */
void ShowDialog(const FunctionCallbackInfo<Value>& info) {
  const auto isolate = info.GetIsolate();
  HandleScope scope(isolate);

  const auto hdc = GetDC(nullptr);
  if (hdc == nullptr) {
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate, "Get HDC failed.")));
    return;
  }
  const auto logpixelsy = ::GetDeviceCaps(hdc, LOGPIXELSY);
  ReleaseDC(nullptr, hdc);

  if (info.Length() < 2) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong number of arguments")));
    return;
  }
  if (!info[1]->IsNull() && !info[1]->IsArrayBufferView()) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong arguments is array buffer")));
    return;
  }
  // Get HWND
  hwnd = nullptr;
  if (!info[0]->IsNull()) {
    const auto bufferHWndData =
        RECAST(unsigned char*)(node::Buffer::Data(info[0]->ToObject()));
    const auto windowHandle = *RECAST(unsigned long*)(bufferHWndData);
    hwnd = RECAST(HWND)(windowHandle);
  }
  if (!info[1]->IsNull()) {
    const auto bufLogFont =
        SCAST(const char*)(node::Buffer::Data(info[1]->ToObject()));
    memcpy(&lfont, bufLogFont, sizeof(LOGFONT));
  }
  // Check EFFECTS Flags
  DWORD flag = CF_SCREENFONTS | CF_INITTOLOGFONTSTRUCT | CF_LIMITSIZE | CF_NOVERTFONTS;
  if (info[2]->BooleanValue()) {
    flag = flag | CF_EFFECTS;
  }

  // fix lfHeight scaling from 96dpi to current device DPI.
  lfont.lfHeight = MulDiv(lfont.lfHeight, logpixelsy, 96);

  // Init CHOOSEFONT dialog box's data structure.
  cf.lStructSize = sizeof(cf);
  cf.hwndOwner = hwnd;
  cf.lpLogFont = &lfont;
  cf.Flags = flag;
  cf.nSizeMin = 8;
  cf.nSizeMax = 60;
  // cf.lpfnHook = RECAST(LPCFHOOKPROC)(WndProc);

  if (ChooseFont(&cf)) {
    // fix lfHeight scaling from current device DPI to 96dpi.
    lfont.lfHeight = MulDiv(lfont.lfHeight, 96, logpixelsy);

    const auto ret = node::Buffer::Copy(isolate, RECAST(const char*)(&lfont),
                                        sizeof(LOGFONT))
                         .ToLocalChecked();
    Local<Object> obj = Object::New(isolate);
    obj->Set(String::NewFromUtf8(isolate, "fontBinary"), ret);

    auto c_ref = ConvertColorRef(cf.rgbColors);
    obj->Set(String::NewFromUtf8(isolate, "fontColor"), 
      String::NewFromUtf8(isolate, c_ref.c_str()));	
    info.GetReturnValue().Set(obj);

  } else {
    if (const auto ex = CommDlgExtendedError()) {
      char err[20];
      snprintf(err, 20, "Error code - %lu", ex);
      isolate->ThrowException(
          Exception::TypeError(String::NewFromUtf8(isolate, err)));
    } else {
      info.GetReturnValue().Set(v8::Null(isolate));
    }
  }
  if (cf.hDC) ReleaseDC(nullptr, cf.hDC);
}

/**
 * @fn
 * GetFontParameter
 * @brief get info LOGFONT structure
 * @param info is buffer
 * @return buffer
 */
void GetFontParameter(const FunctionCallbackInfo<Value>& info) {
  const auto isolate = info.GetIsolate();
  HandleScope scope(isolate);

  if (info[0]->IsUndefined() || !info[0]->IsArrayBufferView()) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, "Wrong number of arguments.")));
    return;
  }
  const auto sizeOfBuffer = node::Buffer::Length(info[0]->ToObject());
  if (sizeOfBuffer < sizeof(LOGFONT)) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, "Received buffer is not enough.")));
    return;
  }
  const auto hdc = GetDC(nullptr);
  if (hdc == nullptr) {
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate, "Get HDC failed.")));
    return;
  }

  const auto bufLogFont =
      SCAST(const char*)(node::Buffer::Data(info[0]->ToObject()));
  const auto lfont = PLOGFONT(bufLogFont);
  auto nFontSize = 0;
  if (lfont->lfHeight < 0) {
    //long logpixelsy = ::GetDeviceCaps(hdc, LOGPIXELSY);
    //nFontSize = -MulDiv(lfont->lfHeight, 72, logpixelsy);
    nFontSize = -MulDiv(lfont->lfHeight, 72, 96);
  } else {
    //nFontSize = lfont->lfHeight;
    nFontSize = MulDiv(lfont->lfHeight, 72, 96);
  }
  ReleaseDC(nullptr, hdc);

  auto result = Object::New(isolate);
  result->Set(String::NewFromUtf8(isolate, "fontName"),
              String::NewFromTwoByte(isolate, RECAST(const uint16_t*)(lfont->lfFaceName)));
  result->Set(String::NewFromUtf8(isolate, "script"),
              Number::New(isolate, lfont->lfCharSet));
  result->Set(String::NewFromUtf8(isolate, "fontSize"),
              Number::New(isolate, nFontSize));
  result->Set(String::NewFromUtf8(isolate, "fontWeight"),
              Number::New(isolate, lfont->lfWeight));
  result->Set(
      String::NewFromUtf8(isolate, "fontStyle"),
      String::NewFromUtf8(isolate, lfont->lfItalic ? "italic" : "normal"));
  std::string textDecoration = lfont->lfUnderline ? "underline;" : "";
  textDecoration += lfont->lfStrikeOut ? "line-through;" : "";
  result->Set(String::NewFromUtf8(isolate, "textDecoration"),
              String::NewFromUtf8(isolate, textDecoration.c_str()));

  info.GetReturnValue().Set(result);
}

/**
 * @fn
 * Init
 * @brief Init Nan function
 * @return void
 */
void Init(const Local<Object> exports) {
  NODE_SET_METHOD(exports, "showDialog", ShowDialog);
  NODE_SET_METHOD(exports, "getFontParameter", GetFontParameter);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Init)

#undef SCAST
#undef RECAST
}