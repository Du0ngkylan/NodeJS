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
using namespace db_manager;
using namespace boost::property_tree;

namespace fs = boost::filesystem;

namespace sms_accessor {

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
    model::SmsSchoolInfo school_info = master_db.GetSchoolInfoDetail(school_id);
    if (school_info.GetSchoolId() == 0) {
      wstring message = L"Not found school - " + to_wstring(school_id);
      SmsErrorLog(message);
      return this->CreateErrorResponse(request, kErrorIOStr, message);
    }
    Json school = this->CreateSchool(school_info);
    response.insert(pair<string, Json>("school", school));
  } catch (SmsDatabaseException &ex) {
    SmsErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  } catch (SmsException &ex) {
    SmsErrorLog(ex.what());
    return this->CreateErrorResponse(request,
                                      kErrorInternalStr, ex.what());
  }
  return Json::object { {"request", request }, {"response", response }};
}

/**
 * @fn
 * CreateSchool
 * @param (info) school info
 * @brief create school detail
 * @return school object
 */
Json SmsGetSchoolDetail::CreateSchool(model::SmsSchoolInfo &info) {
  Json::object school = Json::object{
    { "schoolId", info.GetSchoolId()},
    { "dataFolder", ConvertWstring(info.GetDataFolder())},
    { "displayNumber", info.GetDisplayNumber()},
    { "schoolName", info.GetSchoolName()},
    { "schoolYear", info.GetSchoolYear()},
    { "schoolNumber", info.GetSchoolNumber()},
    { "classTotalCount", info.GetClassTotalCount()},
    { "address", info.GetAddress() }};
  return school;
}

}  // namespace sms_accessor
