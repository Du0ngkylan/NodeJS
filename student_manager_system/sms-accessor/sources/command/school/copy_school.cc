/**
 * @file copy_school.cc
 * @brief copy school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/copy_school.h"
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include "sms_db_if.h"
#include "util/sms_app_util.h"

using namespace std;
using namespace json11;
using namespace sms_db_manager;

namespace fs = boost::filesystem;

namespace sms_accessor {

/**
 * @fn
 * SmsCopyConstruction
 * @brief constructor
 */
SmsCopyConstruction::SmsCopyConstruction() {
  m_data_dir = this->GetSmsAppDataDirectory();
}

/**
 * @fn
 * ~SmsCopyConstruction
 * @brief destructor
 */
SmsCopyConstruction::~SmsCopyConstruction() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json
 * @param (raw) raw string
 */
Json SmsCopyConstruction::ExecuteCommand(Json& request, string& raw) {
  if (!this->ExistsFile(m_data_dir)) {
    wstring message = L"Not found " + m_data_dir;
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  bool use_order_folder = false;
  bool use_external_folder = false;
  bool use_shared = false;
  int src_construction_id;
  int display_number;
  wstring new_data_folder = L"";
  wstring src_construction_dir = L"";
  wstring src_kouji_file = L"";
  manager::SmsConstructionDatabase dest_construction_db;
  try {
    // arguments validation
    ArgurmentsValidation(request["args"], use_order_folder,
                         src_construction_id, display_number,
                         new_data_folder, use_external_folder, use_shared);

    wstring work_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(m_data_dir, work_dir);
    SmsConstructionInfo info = master_db.GetConstructionInfoDetail(src_construction_id);
    if (info.GetConstructionId() == 0) {
      string msg = "Not found constructionId : " + to_string(src_construction_id);
      SmsErrorLog(msg);
      return this->CreateErrorResponse(request, kErrorIOStr, msg);
    }
    src_construction_dir = info.GetDataFolder();

    // directories validation
    DirectoriesValidation(src_construction_dir,
                          src_kouji_file, src_construction_id);
    wstring construction_base_path = GetBasePathToFullPath(src_construction_dir);
    if (use_order_folder == true && !this->ExistsFile(new_data_folder)) {
      CreateNewDir(new_data_folder);
    }
    wstring dest_construction_dir = L"";
    for (int i = 1; i < 100000; i++) {
      dest_construction_dir = construction_base_path + L"\\construction" + to_wstring(i);
      if (!this->ExistsFile(dest_construction_dir)) {
        break;
      }
    }
    wstring dest_dir =
        use_order_folder ? new_data_folder : dest_construction_dir;

    manager::SmsConstructionDatabase src_construction_db =
        master_db.GetConstructionDatabase(src_construction_id);

    info.SetDataFolder(dest_dir);
    info.SetExternalFolder(use_external_folder);
    info.SetSharedFolder(use_shared);

    // create new record in masterDB.db
    int new_construction_id = master_db.CreateConstruction(info);
    // copy kouji.xml to dest
    wstring kouji_xml = dest_dir + KOUJI;
    fs::wpath src(src_kouji_file);
    fs::wpath dest(kouji_xml);
    fs::copy_file(src, dest, fs::copy_option::overwrite_if_exists);

    // update createDate, GUID
    auto pt_kouji = ReadUnicodeXML(kouji_xml);
    auto& root = pt_kouji.get_child(L"工事情報");
    auto& v_cd = GetWStringFJson(m_create_date);
    auto& v_guid = GetWStringFJson(m_guid);
    root.put(L"工事日付", v_cd);
    root.put(L"GUID", v_guid);
    WriteUnicodeXML(kouji_xml, pt_kouji);

    // get record from source construction
    // update record to destination construction
    dest_construction_db = master_db.GetConstructionDatabase(new_construction_id);

    dest_construction_db.BeginTransaction();
    model::SmsConstructionPhotoInfo photo_info =
        src_construction_db.GetConstructionPhotoInfoTree();
    if (photo_info.GetItemId() != 0) {
      dest_construction_db.AddConstructionPhotoInfoTree(photo_info);
    }

    model::SmsConstructionSettings construction_settings =
        src_construction_db.GetConstructionSettings();
    dest_construction_db.UpdateConstructionSettings(construction_settings);

    model::SmsPrintSettings print_settings =
        src_construction_db.GetPrintSettings();
    dest_construction_db.UpdatePrintSettings(print_settings);
    dest_construction_db.Commit();

    Json response = Json::object{{"constructionId", new_construction_id}};
    return Json::object{{"request", request}, {"response", response}};
  } catch (fs::filesystem_error& ex) {
    string msg = ex.what();
    SmsErrorLog(msg);
    return this->CreateErrorResponse(request, kErrorIOStr, msg);
  } catch (SmsException& ex) {
    SmsErrorLog(ex.What());
    return this->CreateErrorResponse(request, m_error_type, ex.What());
  } catch (SmsDatabaseException& ex) {
    SmsErrorLog(ex.What());
    dest_construction_db.Rollback();
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.What());
  }
}

/**
 * @fn
 * CreateNewDir
 * @brief create new directory
 * @param path path name
 */
void SmsCopyConstruction::CreateNewDir(wstring path) {
  try {
    fs::create_directory(path);
  } catch (fs::filesystem_error& ex) {
    m_error_type = kErrorIOStr;
    throw SmsException(ex.what());
  }
}

/**
 * @fn
 * DirectoriesValidation
 * @brief directories validation
 * @param src_construction_dir source construction dir
 * @param src_kouji_file source kouji file
 * @param src_contruction_id source contruction id in integer
 */
void SmsCopyConstruction::DirectoriesValidation(wstring& src_construction_dir,
                       wstring& src_kouji_file, const int src_contruction_id) {
  if (src_construction_dir == L"") {
    m_error_type = kErrorInvalidCommandStr;
    throw SmsException(L"Not found constructionId : " + to_wstring(src_contruction_id));
  }

  if (!this->ExistsFile(src_construction_dir)) {
    m_error_type = kErrorIOStr;
    throw SmsException(L"Not found " + src_construction_dir);
  }

  src_kouji_file = src_construction_dir + KOUJI;
  if (!this->ExistsFile(src_kouji_file)) {
    m_error_type = kErrorIOStr;
    throw SmsException(L"Not found " + src_kouji_file);
  }

  wstring contruction_database_dir = src_construction_dir + CONSTRUCTION_DB;
  if (!this->ExistsFile(contruction_database_dir)) {
    m_error_type = kErrorIOStr;
    throw SmsException(L"Not found " + contruction_database_dir);
  }
}

/**
 * @fn
 * ArgurmentsValidation
 * @brief argument validation
 * @param arguments arguments
 * @param use_order_folder use orderfolder
 * @param display_number new construction id in integer
 * @param new_data_folder new data folder
 * @param src_construction_id source construction id
 * @param use_external_folder use external folder
 * @param use_shared use shared
 */
void SmsCopyConstruction::ArgurmentsValidation(
                          const Json arguments,
                          bool& use_order_folder,
                          int& src_construction_id,
                          int& display_number,
                          wstring& new_data_folder,
                          bool& use_external_folder,
                          bool& use_shared
                          ) {
  if (arguments["displayNumber"].is_null() ||
      !arguments["displayNumber"].is_number()) {
    m_error_type = kErrorInvalidCommandStr;
    throw SmsException("'args.displayNumber' is not specified");
  }
  display_number = arguments["displayNumber"].int_value();

  if (!arguments["newDataFolder"].is_null() &&
      arguments["newDataFolder"].is_string() &&
      arguments["newDataFolder"].string_value() != "") {
    use_order_folder = true;
    new_data_folder =
        this->Utf8ToUtf16(arguments["newDataFolder"].string_value());
    if (new_data_folder == m_data_dir) {
      m_error_type = kErrorInvalidCommandStr;
      throw SmsException("'args.newDataFolder' is not valid");
    }
  }
  if (!arguments["useExternalFolder"].is_null() &&
    arguments["useExternalFolder"].is_bool() &&
    arguments["useExternalFolder"].bool_value() == true) {
    use_external_folder = true;
  }
  if (!arguments["useSharedFolder"].is_null() &&
    arguments["useSharedFolder"].is_bool() &&
    arguments["useSharedFolder"].bool_value() == true) {
    use_shared = true;
  }

  if (arguments["srcConstructionId"].is_null() ||
      !arguments["srcConstructionId"].is_number()) {
    m_error_type = kErrorInvalidCommandStr;
    throw SmsException("'args.srcConstructionId' is not specified");
  }
  src_construction_id = arguments["srcConstructionId"].int_value();

  auto & construction = arguments["construction"];
  if (construction["createDate"].is_null()
    || !construction["createDate"].is_string()) {
    m_error_type = kErrorInvalidCommandStr;
    throw SmsException("'args.construction.createDate' is not specified");
  }
  m_create_date = construction["createDate"].string_value();

  if (construction["guId"].is_null()
    || !construction["guId"].is_string()) {
    m_error_type = kErrorInvalidCommandStr;
    throw SmsException("'args.construction.guId' is not specified");
  }
  m_guid = construction["guId"].string_value();
}

/**
* @fn
* GetBasePathToFullPath
* @brief return base path to full path
* @param full_path
* @return base path
*/
wstring SmsCopyConstruction::GetBasePathToFullPath(wstring full_path) {
  int base_path_endpoint = full_path.find_last_of(L"\\");
  wstring base_path = full_path.substr(0, base_path_endpoint);
  return base_path;
}
}  // namespace sms_accessor
