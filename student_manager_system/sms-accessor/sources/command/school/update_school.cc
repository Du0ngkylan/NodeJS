/**
 * @file update_school.cc
 * @brief update school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <boost/filesystem.hpp>
#include "command/school/update_school.h"

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
SmsUpdateSchool::~SmsUpdateSchool() {}

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
    auto message = L"Not found " + data_dir;
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
    Json response = Json::object{{"updateCount", 1}};
	} catch (SmsException& ex) {
		return this->CreateErrorResponse(request,	kErrorInvalidCommandStr, ex.What());
	}
}

}  // namespace sms_accessor
