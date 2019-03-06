#include <iostream>
#include <cstring>
#include <vector>
#include <node.h>
#include <node_buffer.h>

#define DEF(ID,PATH,MIME,LENGTH, ...) extern "C" const char ID[];
#  include "contents.def"
#undef DEF


namespace pembeditor {

using v8::Function;
using v8::FunctionTemplate;
using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Context;
using v8::Local;
using v8::Persistent;
using v8::HandleScope;
using v8::EscapableHandleScope;
using v8::Object;
using v8::String;
using v8::RegExp;
using v8::Value;
using v8::Boolean;

typedef struct {
  const char *path;
  const char *mime;
  size_t length;
  const char *data;
} CONTENTS_DATA;

static const char *PROTOCOL_NAME = 
#  include "protocol_name.h"
;

static std::vector<CONTENTS_DATA> contents_data = {
#define DEF(ID,PATH,MIME,LENGTH,...) { PATH, MIME, LENGTH, ID },
#  include "contents.def"
#undef DEF
};

static Persistent<Object> p_contents;
static Persistent<Object> p_electron;
static Persistent<String> p_protocol_prefix;
static Persistent<RegExp> p_regexp1;
static Persistent<RegExp> p_regexp2;


static void print_object(v8::Isolate *isolate, const char *message, v8::Handle<v8::Value> object)
{
#if 1
  std::cout << message;
  v8::Local<v8::Object> global = isolate->GetCurrentContext()->Global();

  v8::Local<v8::Object> console = v8::Local<v8::Object>::Cast(global->Get( v8::String::NewFromUtf8(isolate, "console") ));
  v8::Local<v8::Function> log = v8::Local<v8::Function>::Cast(console->Get( v8::String::NewFromUtf8(isolate, "log") ));

  v8::Local<v8::Value> log_argv[1] = { object };
  log->Call(console, 1, log_argv);
#endif
}

static void ProtocolCallback(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  HandleScope scope(isolate);
  Local<Object> contentsList = Local<Object>::New(isolate, p_contents);

  if ( !args[0]->IsObject() ) {
    return;
  }

  if ( !args[1]->IsFunction() ) {
    return;
  }

  /*
   * JavaScript code which is equivalent to following procedure of this function.
   *   +-------------------------------------------------------------------+
   *   |                                                                   |
   *   | function(request,callback) {                                      |
   *   |   var reqPath = request.url              --(A)                    |
   *   |     .replace(PROTOCOLNAME+'://', '')                              |
   *   |     .replace(/#.*$/, '')                                          |
   *   |     .replace(/\?.*$/, '');                                        |
   *   |                                                                   |
   *   |   var content = contentsList[reqPath];   --(B)                    |
   *   |   if (content) {                                                  |
   *   |     console.log('pembed: found');        --(C)                    |
   *   |     callback(content);                                            |
   *   |   } else {                                                        |
   *   |     console.log('pembed: not found');    --(D)                    |
   *   |     return;                                                       |
   *   |   }                                                               |
   *   | });                                                               |
   *   |                                                                   |
   *   +-------------------------------------------------------------------+
   */

  // (A)
  Local<Object> url = Local<Object>::Cast(Local<Object>::Cast(args[0])->Get(String::NewFromUtf8(isolate,"url")));
  Local<Function> replace = Local<Function>::Cast(url->Get(String::NewFromUtf8(isolate,"replace")));
  Local<Value> replace_argv1[2] = { Local<String>::New(isolate, p_protocol_prefix), String::NewFromUtf8(isolate, "") };
  Local<Object> replace_result1 = Local<Object>::Cast(replace->Call(isolate->GetCurrentContext(), url, 2, replace_argv1).ToLocalChecked());
  Local<Value> replace_argv2[2] = { Local<RegExp>::New(isolate, p_regexp1), String::NewFromUtf8(isolate, "") };
  Local<Object> replace_result2 = Local<Object>::Cast(replace->Call(isolate->GetCurrentContext(), replace_result1, 2, replace_argv2).ToLocalChecked());
  Local<Value> replace_argv3[2] = { Local<RegExp>::New(isolate, p_regexp2), String::NewFromUtf8(isolate, "") };
  Local<Object> reqPath = Local<Object>::Cast(replace->Call(isolate->GetCurrentContext(), replace_result2, 2, replace_argv3).ToLocalChecked());

  // (B)
  Local<Object> content = Local<Object>::Cast(contentsList->Get(reqPath));
  if ( content.IsEmpty() || !content->IsObject()) {
    // (D)
    print_object(isolate, "pembed: not found ", url);
    return;
  } else {
    // (C)
    print_object(isolate, "pembed: found ", url);
    Local<Function> cb = Local<Function>::Cast(args[1]);
    Local<Value> cb_argv[1] = { content };
    cb->Call(isolate->GetCurrentContext()->Global(), 1, cb_argv);
  }
}


static Local<Object> CreateObjectHavingContents(Isolate *isolate)
{
  EscapableHandleScope scope(isolate);
  Local<Object> result = Object::New(isolate);

  /*
   * JavaScript code which is equivalent to following procedure of this function.
   *   +--------------------------------------------------------------------+
   *   |                                                                    |
   *   | function() {                                                       |
   *   |   return {                                                         |
   *   |     "": { mimeType:"", charset:"utf-8", data: Buffer.copy("") },   |
   *   |     "": { mimeType:"", charset:"utf-8", data: Buffer.copy("") },   |
   *   |       :                                                            |
   *   |   }                                                                |
   *   | }                                                                  |
   *   |                                                                    |
   *   +--------------------------------------------------------------------+
   */

  for(auto itr = contents_data.begin(); itr != contents_data.end(); ++itr) {
    Local<Object> content = Object::New(isolate);
    content->Set( String::NewFromUtf8(isolate, "mimeType"), String::NewFromUtf8(isolate, itr->mime) );
    content->Set( String::NewFromUtf8(isolate, "charset"), String::NewFromUtf8(isolate, "utf-8") );
    content->Set( String::NewFromUtf8(isolate, "data"),
        node::Buffer::Copy(isolate, itr->data, itr->length).ToLocalChecked() );
    result->Set( String::NewFromUtf8(isolate, itr->path), content );
  }

  return scope.Escape(result);
}

static void RegisterNewProtocol(const FunctionCallbackInfo<Value>& args)
{
  Isolate *isolate = args.GetIsolate();
  HandleScope handle_scope(isolate);

  /*
   * JavaScript code which is equivalent to following procedure of this function.
   *   +--------------------------------------------------------------------+
   *   |                                                                    |
   *   | function() {                                                       |
   *   |   p_contents = CreateObjectHavingContents();     --(A)             |
   *   |   let protocol = p_electron.protocol;            --(B)             |
   *   |                                                                    |
   *   |   protocol.registerBufferProtocol(               --(C)             |
   *   |     PROTOCOL_NAME,                                                 |
   *   |     ProtocolCallback);                           --(C')            |
   *   | }                                                                  |
   *   |                                                                    |
   *   +--------------------------------------------------------------------+
   */

  // (A)
  Local<Object> contents = CreateObjectHavingContents(isolate);
  p_contents.Reset(isolate, contents);

  // (B)
  Local<Object> electron = Local<Object>::New(isolate, p_electron);
  Local<Object> protocol = electron->Get(String::NewFromUtf8(isolate,"protocol")).As<Object>();

  // (C')
  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, ProtocolCallback);
  Local<Function> fn = tpl->GetFunction();

  // (C)
  Local<Function> registerBufferProtocol = Local<Function>::Cast(protocol->Get(String::NewFromUtf8(isolate, "registerBufferProtocol")));
  Local<Value> registerBufferProtocol_argv[2] = { String::NewFromUtf8(isolate, PROTOCOL_NAME), fn };
  registerBufferProtocol->Call(protocol, 2, registerBufferProtocol_argv);
}


static void Initialize(Local<Object> exports, Local<Object> module)
{
  Isolate *isolate = module->GetIsolate();
  HandleScope handle_scope(isolate);

  /*
   * JavaScript code which is equivalent to following procedure of this function.
   *   +-------------------------------------------------------------------+
   *   |                                                                   |
   *   | var p_electron;                                                   |
   *   | var p_protocol_prefix;                                            |
   *   | var p_regexp1;                                                    |
   *   | var p_regexp2;                                                    |
   *   | function() {                                                      |
   *   |   let electron = require('electron');                     --(A)   |
   *   |   let app = electron.app                                  --(A)   |
   *   |                                                                   |
   *   |   p_electron = electron;                                  --(C)   |
   *   |   p_protocol_prefix = PROTOCOL_NAME+'://';                --(C)   |
   *   |   p_regexp1 = /#.*$/;                                     --(D)   |
   *   |   p_regexp2 = /\?.*$/;                                    --(D)   |
   *   |                                                                   |
   *   |   if (app.isReady()) {                                    --(B)   |
   *   |     app.prependOnceListener('ready', RegisterNewProtocol);--(B)   |
   *   |   } else {                                                --(B)   |
   *   |     RegisterNewProtocol();                                --(B)   |
   *   |   }                                                               |
   *   | }                                                                 |
   *   |                                                                   |
   *   +-------------------------------------------------------------------+
   */

  // (A)
  Local<Function> require = Local<Function>::Cast(module->Get(String::NewFromUtf8(isolate, "require")));
  Local<Value> require_argv[1] = { String::NewFromUtf8(isolate, "electron") };
  Local<Object> electron = require->Call(isolate->GetCurrentContext(), module, 1, require_argv).ToLocalChecked().As<Object>();
  Local<Object> app = Local<Object>::Cast(electron->Get(String::NewFromUtf8(isolate,"app")));

  // (C)
  p_electron.Reset(isolate, electron);
  p_protocol_prefix.Reset(isolate, String::Concat(
        String::NewFromUtf8(isolate, PROTOCOL_NAME),
        String::NewFromUtf8(isolate, "://")));

  // (D)
  Local<RegExp> rg1 = RegExp::New(String::NewFromUtf8(isolate, "#.*$"), RegExp::Flags::kNone);
  Local<RegExp> rg2 = RegExp::New(String::NewFromUtf8(isolate, "\\?.*$"), RegExp::Flags::kNone);
  p_regexp1.Reset(isolate, rg1);
  p_regexp2.Reset(isolate, rg2);

  // (B)
  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, RegisterNewProtocol);
  Local<Function> fn = tpl->GetFunction();
  Local<Function> isReady = app->Get(String::NewFromUtf8(isolate, "isReady")).As<Function>();
  print_object(isolate, "1", String::NewFromUtf8(isolate,"dummy"));
  Local<Value> isReadyResult = isReady->Call(isolate->GetCurrentContext(), app, 0, nullptr).ToLocalChecked();
  print_object(isolate, "2", String::NewFromUtf8(isolate,"dummy"));
  if (isReadyResult->IsTrue()) {
    print_object(isolate, "3", String::NewFromUtf8(isolate,"dummy"));
    fn->Call(isolate->GetCurrentContext(), isolate->GetCurrentContext()->Global(), 0, nullptr);
  } else {
    print_object(isolate, "4", String::NewFromUtf8(isolate,"dummy"));
    Local<Function> prepend = app->Get(String::NewFromUtf8(isolate, "prependOnceListener")).As<Function>();
    Local<Value> prepend_argv[2] = { String::NewFromUtf8(isolate, "ready"), fn };
    prepend->Call(isolate->GetCurrentContext(), app, 2, prepend_argv);
    print_object(isolate, "5", String::NewFromUtf8(isolate,"dummy"));
  }
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

}  // namespace pembeditor


