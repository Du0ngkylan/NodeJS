/**
 * @file delete_school.cc
 * @brief delete school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/delete_school.h"
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include "sms_db_if.h"
#include "util/sms_app_util.h"

using namespace std;
using namespace json11;
using namespace db_manager;

namespace sms_accessor {

/**
 * @fn
 * SmsDeleteSchool
 * @brief constructor
 */
SmsDeleteSchool::SmsDeleteSchool() {}

/**
 * @fn
 * ~SmsDeleteSchool
 * @brief destructor
 */
SmsDeleteSchool::~SmsDeleteSchool() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json
 * @param (raw) raw string
 */
Json SmsDeleteSchool::ExecuteCommand(Json &request, string &raw) {
  auto data_dir = this->GetSmsAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    auto message = L"not found " + data_dir;
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }
  auto j_school_id = request["args"]["schoolId"];
  auto j_delete_flag = request["args"]["deleteDirectory"];
  // validate arguments
  if (j_school_id.is_null() || !j_school_id.is_number()) {
    string message = "'args.schoolId' is not specified";
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }

  auto delete_flag = true;
  if (!j_delete_flag.is_null() && j_delete_flag.is_bool()) {
    delete_flag = j_delete_flag.bool_value();
  }

  // delete directory
  auto school_id = j_school_id.int_value();
  try {
    auto work_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, work_dir);
    auto school_info =  master_db.GetSchoolInfo(school_id);
    if (school_info.GetSchoolId() == 0) {
      return this->CreateErrorResponse(request,
                                       kErrorIOStr, "not found school");
    }
    master_db.DeleteSchool(school_info, delete_flag);
  } catch (SmsDatabaseException &ex) {
    SmsErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  } catch (std::exception) {
    return this->CreateErrorResponse(request, kErrorIOStr,
                                     "failed to delete school");
  }
  Json response = Json::object{{"schoolId", school_id}};
  return Json::object{{"request", request}, {"response", response}};
}

}  // namespace sms_accessor
