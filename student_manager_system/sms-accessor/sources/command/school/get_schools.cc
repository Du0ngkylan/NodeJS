/**
 * @file get_schools.cc
 * @brief get schools command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/get_schools.h"
#include <windows.h>
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include <boost/property_tree/xml_parser.hpp>
#include "util/sms_app_util.h"

using namespace std;
using namespace json11;
using namespace db_manager;

namespace fs = boost::filesystem;

namespace sms_accessor {


/**
 * @fn
 * SmsGetschools
 * @brief constructor
 */
SmsGetSchools::SmsGetSchools() {}

/**
 * @fn
 * ~SmsGetSchools
 * @brief destructor
 */
SmsGetSchools::~SmsGetSchools() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json 
 * @param (raw) raw string
 */
Json SmsGetSchools::ExecuteCommand(Json &request,
                                   string &raw) {
  wstring data_dir = this->GetSmsAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + data_dir;
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  try {
    wstring work_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, work_dir);
    vector<model::SmsSchoolInfo> out_schools;
    master_db.GetschoolInfos(out_schools);

    Json::array schools = Json::array();
    for (auto &school_item : out_schools) {
      Json school = this->CreateSchool(school_item);
      schools.push_back(school);
    }
    Json response = Json::object{ { "schools", schools }};
    return Json::object{{ "request", request }, { "response", response }};
    } catch (SmsDatabaseException &ex) {
      SmsErrorLog(ex.What());
      return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
    } catch (SmsException &ex) {
      SmsErrorLog(ex.what());
      return this->CreateErrorResponse(request, kErrorInternalStr, ex.what());
    }
}

/**
 * @fn
 * CreateSchool
 * @param (info) school info 
 * @brief create school
 * @return school object
 */
Json SmsGetSchools::CreateSchool(model::SmsSchoolInfo &info) {
  try {
    Json::object school = Json::object{
      { "schoolId", info.GetschoolId() },
      { "displayNumber", info.GetDisplayNumber() },
      { "schoolNumber", info.GetschoolNumber() },
      { "schoolName", constructor_name },
      { "dataFolder", this->ConvertWstring(info.GetDataFolder()) },
    };

    // case kuraemon-connect
    auto year = info.GetSchoolYear();
    if (year) {
      school["year"] = info.GetSchoolYear();
    } else {
      school["year"] = "";
    }

    return school;
  } catch (SmsException &ex) {
    throw ex;
  }
}


}  // namespace sms_accessor
