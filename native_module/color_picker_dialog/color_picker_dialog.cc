#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <string>
#include <iostream>
#include <regex>
#include <sstream>
#include <iomanip>
#include <codecvt>
#include "windows.h"

using namespace v8;
using namespace std;

namespace native_ui {

#define RECAST(type) reinterpret_cast<type>
#define SCAST(type) static_cast<type>

static CHOOSECOLOR cc = {0};

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
 * @brief show native print dialog
 * @param info is buffer
 * @return buffer
 */
void showDialog(const FunctionCallbackInfo<Value> &info) {
  const auto isolate = info.GetIsolate();
  HandleScope handleScope(isolate);
  HWND hwnd = nullptr;

  if (info.Length() < 2) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, "Wrong number of arguments")));
    return;
  }

  if (!info[1]->IsString()) {
    isolate->ThrowException(Exception::Error(
      String::NewFromUtf8(isolate, "Wrong arguments")));
    return;
  }

  if (!info[0]->IsNull()) {
    const auto bufferHWndData =
      RECAST(unsigned char *)(node::Buffer::Data(info[0]->ToObject()));
    const auto windowHandle = *RECAST(unsigned long *)(bufferHWndData);
    hwnd = RECAST(HWND)(windowHandle);
  }

  Local<String> v8str = info[1]->ToString();
  String::Utf8Value str(info[1]->ToString());
  COLORREF rgbResult;

  string strColor(*str);
  regex pattern("#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})");
  smatch match;

  if (regex_match(strColor, match, pattern)) {
    auto r = stoul(match[1].str(), nullptr, 16);
    auto g = stoul(match[2].str(), nullptr, 16);
    auto b = stoul(match[3].str(), nullptr, 16);
    rgbResult = RGB(r, g, b);
  } else {
    isolate->ThrowException(Exception::Error(
      String::NewFromUtf8(isolate, "Invalid rgb color")));
    return;
  }

  DWORD custColors[16];
  for (int i = 0; i < 16; i++) {
    custColors[i] = RGB(255, 255, 255);
  }

  string original("");
  string r("");
  string g("");
  string b("");
  memset(&cc, 0, sizeof(CHOOSECOLOR));
  cc.lStructSize = sizeof(CHOOSECOLOR);
  cc.hwndOwner = hwnd;
  cc.rgbResult = rgbResult;
  cc.lpCustColors = custColors;
  cc.Flags = CC_RGBINIT;
  cc.lCustData = 0;

  if (ChooseColor(&cc)) {
    COLORREF cr = cc.rgbResult;
    original = ConvertColorRef(cr);
    int ir = GetRValue(cr);
    int ig = GetGValue(cr);
    int ib = GetBValue(cr);
    r = to_string(ir);
    g = to_string(ig);
    b = to_string(ib);
  }

  auto v8org = String::NewFromUtf8(v8::Isolate::GetCurrent(), original.c_str());
  auto v8r = String::NewFromUtf8(v8::Isolate::GetCurrent(), r.c_str());
  auto v8g = String::NewFromUtf8(v8::Isolate::GetCurrent(), g.c_str());
  auto v8b = String::NewFromUtf8(v8::Isolate::GetCurrent(), b.c_str());

  Local<Object> inner = Object::New(isolate);
  inner->Set(String::NewFromUtf8(isolate, "original"), v8org);
  inner->Set(String::NewFromUtf8(isolate, "r"), v8r);
  inner->Set(String::NewFromUtf8(isolate, "g"), v8g);
  inner->Set(String::NewFromUtf8(isolate, "b"), v8b);
  info.GetReturnValue().Set(inner);
}

void Init(const Local<Object> exports) {
  NODE_SET_METHOD(exports, "showDialog", showDialog);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Init)

#undef SCAST
#undef RECAST

}