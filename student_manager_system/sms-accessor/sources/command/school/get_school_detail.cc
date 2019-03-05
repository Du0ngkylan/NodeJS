/**
 * @file get_school_detail.cc
 * @brief get school detail command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/get_school_detail.h"
#include <windows.h>
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include <boost/property_tree/xml_parser.hpp>
#include "util/sms_app_util.h"

using namespace std;
using namespace json11;
using namespace sms_db_manager;
using namespace boost::property_tree;

namespace fs = boost::filesystem;

namespace sms_accessor {

const wstring KOUJI_XML = L"\\KOUJI.XML";
const wstring ROOT_ATTR_NAME = L"工事情報";

/**
 * @fn
 * SmsGetSchoolDetail
 * @brief constructor
 */
SmsGetSchoolDetail::SmsGetSchoolDetail() {}

/**
 * @fn
 * ~SmsGetSchoolDetail
 * @brief destructor
 */
SmsGetSchoolDetail::~SmsGetSchoolDetail() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json 
 * @param (raw) raw string
 */
Json SmsGetSchoolDetail::ExecuteCommand(Json &request,
                                        string &raw) {
  wstring data_dir = this->GetSmsAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + data_dir;
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  if (request["args"]["schoolId"].is_null() ||
      !request["args"]["schoolId"].is_number()) {
    string message = "'args.schoolId' is not specified";
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  bool get_folder_size = true;
  if (!request["args"]["getFolderSize"].is_null() ||
      request["args"]["getFolderSize"].is_bool()) {
    get_folder_size = request["args"]["getFolderSize"].bool_value();
  }

  int school_id = request["args"]["schoolId"].int_value();
  Json::object response = Json::object();
  try {
    wstring work_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, work_dir);
    SmsSchoolInfo school_info = master_db.GetSchoolInfoDetail(school_id);
    if (school_info.GetSchoolId() == 0) {
      wstring message = L"Not found school - " + to_wstring(school_id);
      SmsErrorLog(message);
      return this->CreateErrorResponse(request, kErrorIOStr, message);
    }
    Json school = this->CreateSchool(school_info, master_db, get_folder_size);
    response.insert(pair<string, Json>("school", school));
  } catch (SmsDatabaseException &ex) {
    SmsErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  } catch (SmsException &ex) {
    SmsErrorLog(ex.what());
    return this->CreateErrorResponse(request,
                                      kErrorInternalStr, ex.what());
  }
  return Json::object { {"request", request }, {"response", response } };
}

/**
 * @fn
 * CreateSchool
 * @param (info) school info
 * @param (db) school database
 * @param (get_folder_size) get folder size flag
 * @brief create school detail
 * @return school object
 */
Json SmsGetSchoolDetail::CreateSchool(
  model::SmsSchoolInfo &info,
  manager::SmsMasterDatabase &db,
  bool get_folder_size) {
  // read school(kouji) information
  wstring school_dir = info.GetDataFolder();
  wstring kouji_xml = school_dir + KOUJI_XML;
  unsigned long long ext_data_dir_size = 0;

  try {
    // have kouji.xml?
    if (!ExistsFile(kouji_xml)) {
      wstring message = L"Not found " + kouji_xml;
      throw SmsException(message, __FILE__, __FUNCTION__, __LINE__);
    }

    if (get_folder_size) {
      ext_data_dir_size = SmsAppUtil::GetTotalDirectorySize(school_dir);
    }
    wptree school_info = ReadUnicodeXML(kouji_xml);

    string d_type = SmsAppUtil::GetDriveTypeString(info.GetDataFolder());
    Json::object school = Json::object{
      { "schoolId", info.GetschoolId() },
      { "displayNumber", info.GetDisplayNumber() },
      { "schoolNumber", info.GetschoolNumber() },
      { "schoolName", info.GetschoolName() },
      { "startDate", info.GetStartDate() },
      { "endDate", info.GetEndDate() },
      { "dataFolder", ConvertWstring(info.GetDataFolder()) },
      { "driveType", d_type },
    };
    return school;
  } catch (SmsException &ex) {
    throw ex;
  } catch (xml_parser_error& ex) {
    throw ex;
  }
}


}  // namespace sms_accessor
