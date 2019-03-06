/**
 * @file update_school.cc
 * @brief update school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <boost/filesystem.hpp>
#include "command/school/update_school.h"
#include "sms_db_if.h"

using namespace std;
using namespace json11;
using namespace db_manager;

namespace fs = boost::filesystem;
namespace pt = boost::property_tree;

namespace sms_accessor {


/**
 * @fn
 * SmsUpdateSchool
 * @brief constructor
 */
SmsUpdateSchool::SmsUpdateSchool() {}

/**
 * @fn
 * ~SmsUpdateSchool
 * @brief destructor
 */
SmsUpdateSchool::~SmsUpdateSchool() = default;

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw string of request
 */
Json SmsUpdateSchool::ExecuteCommand(Json& request, string& raw) {
  wstring data_dir = this->GetSmsAppDataDirectory();
  if (!ExistsFile(data_dir)) {
    auto message = L"Not found SmsAppDataDirectory " + data_dir;
    SmsErrorLog(message);
    return CreateErrorResponse(request, kErrorIOStr, message);
  }

  const auto& school = request["args"]["school"];
  if (school.is_null() || !school.is_object()) {
    const string message = "'args.school' is not specified";
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  model::SmsSchoolInfo school_info{};
	try {
    GetSchoolInfo(school_info, school);
	} catch (SmsException& ex) {
		return this->CreateErrorResponse(request,	kErrorInvalidCommandStr, ex.What());
	}

  try {
    const auto work_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, work_dir);
    try {
      master_db.BeginTransaction();
      if (school_info.GetSchoolId()) {
        master_db.UpdateSchool(school_info);
        master_db.Commit();
        Json response = Json::object{{"schoolId", school_info.GetSchoolId()}};
        return Json::object{{"request", request}, {"response", response}};
      }
      auto new_school_id = master_db.CreateSchool(school_info);
      master_db.Commit();
      Json response = Json::object{{"schoolId", new_school_id}};
      return Json::object{{"request", request}, {"response", response}};
    } catch (SmsException& ex) {
      master_db.Rollback();
			return this->CreateErrorResponse(request, kErrorInvalidCommandStr, ex.What());
    }
  } catch (SmsDatabaseException& ex) {
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.What());
  }
}

}  // namespace sms_accessor
