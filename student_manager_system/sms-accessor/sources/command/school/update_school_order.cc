/**
 * @file update_school_order.cc
 * @brief update school order command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <boost/filesystem.hpp>
#include "command/school/update_school_order.h"
#include "util/sms_app_util.h"
#include "sms_db_if.h"

using namespace std;
using namespace json11;
using namespace db_manager;

namespace pt = boost::property_tree;
namespace sms_accessor {

/**
 * @fn
 * SmsUpdateSchoolOrder
 * @brief constructor
 */
SmsUpdateSchoolOrder::SmsUpdateSchoolOrder() {}

/**
 * @fn
 * ~SmsUpdateSchoolOrder
 * @brief destructor
 */
SmsUpdateSchoolOrder::~SmsUpdateSchoolOrder() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 */
Json SmsUpdateSchoolOrder::ExecuteCommand(Json& request, string& raw) {
  auto data_dir = this->GetSmsAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    auto message = L"Not found " + data_dir;
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }
  // validate arguments
  auto& j_school = request["args"]["schools"];
  if (j_school.is_null() || !j_school.is_array()) {
    const string message = "'args.schools' is not specified";
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  try {
    const auto work_dir = GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, work_dir);
    Json response = Json::object{{"updateCount", 1}};
    return Json::object{{"request", request}, {"response", response}};
  } catch (SmsException& ex) {
    return this->CreateErrorResponse(request, kErrorIOStr, ex.what());
  } catch (SmsDatabaseException& ex) {
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.what());
  }
}

}  // namespace sms_accessor
