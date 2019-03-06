/**
 * @file sync_school.cc
 * @brief sync school (all databases)
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/sync_school.h"
#include "util/sms_app_util.h"

using namespace std;
using namespace json11;
using namespace db_manager;

namespace sms_accessor {

/**
 * @fn
 * SmsSyncSchool
 * @brief constructor
 */
SmsSyncSchool::SmsSyncSchool() {}

/**
 * @fn
 * ~SmsSyncSchool
 * @brief destructor
 */
SmsSyncSchool::~SmsSyncSchool() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 * @return result json
 */
Json SmsSyncSchool::ExecuteCommand(Json &request, string &raw) {
  auto data_dir = this->GetSmsAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    auto message = L"Not found " + data_dir;
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }
  auto &j_school_id = request["args"]["schoolId"];
  int school_id = 0;
  if (!j_school_id.is_null() && j_school_id.is_number()) {
    school_id = j_school_id.int_value();
  }
  auto &j_class_id = request["args"]["classId"];
  int class_id = 0;
  if (!j_class_id.is_null() && j_class_id.is_number()) {
    class_id = j_class_id.int_value();
  }

  try {
    auto work_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, work_dir);
    Json response = Json::object{{"status", "ok" }};
    return Json::object{{"request", request}, {"response", response}};
  } catch (SmsDatabaseException &ex) {
    SmsErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  }
}

}  // namespace sms_accessor
