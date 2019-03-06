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
using namespace db_manager;

namespace fs = boost::filesystem;

namespace sms_accessor {

/**
 * @fn
 * SmsCopySchool
 * @brief constructor
 */
SmsCopySchool::SmsCopySchool() {}

/**
 * @fn
 * ~SmsCopySchool
 * @brief destructor
 */
SmsCopySchool::~SmsCopySchool() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json
 * @param (raw) raw string
 */
Json SmsCopySchool::ExecuteCommand(Json& request, string& raw) {
  auto data_dir = this->GetSmsAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + m_data_dir;
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  try {
    wstring work_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, work_dir);
    SmsSchoolInfo info = master_db.GetSchoolInfoDetail(1);
    if (info.GetConstructionId() == 0) {
      string msg = "Not found constructionId : " + to_string(1);
      SmsErrorLog(msg);
      return this->CreateErrorResponse(request, kErrorIOStr, msg);
    }

    Json response = Json::object{{"schoolId", 1}};
    return Json::object{{"request", request}, {"response", response}};
  } catch (fs::filesystem_error& ex) {
    SmsErrorLog(ex.what());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.what());
  } catch (SmsException& ex) {
    SmsErrorLog(ex.What());
    return this->CreateErrorResponse(request, m_error_type, ex.What());
  } catch (SmsDatabaseException& ex) {
    SmsErrorLog(ex.What());
    dest_construction_db.Rollback();
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.What());
  }
}

}  // namespace sms_accessor
