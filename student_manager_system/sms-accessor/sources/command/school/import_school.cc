/**
 * @file import_school.cc
 * @brief import school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/import_school.h"
#include "util/sms_app_util.h"
#include <command/school/get_school_detail.h>
#include <boost/date_time/local_time/custom_time_zone.hpp>
#include <boost/date_time/posix_time/ptime.hpp>


using namespace std;
using namespace json11;
using namespace db_manager;

namespace fs = boost::filesystem;
namespace pt = boost::property_tree;


namespace sms_accessor {

/**
 * @fn
 * SmsImportSchool
 * @brief constructor
 */
SmsImportSchool::SmsImportSchool() {}

/**
 * @fn
 * ~SmsImportSchool
 * @brief destructor
 */
SmsImportSchool::~SmsImportSchool() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 * @return result json
 */
Json SmsImportSchool::ExecuteCommand(Json &request, string &raw) {
	auto data_dir = this->GetSmsAppDataDirectory();
	if (!ExistsFile(data_dir)) {
		const auto message = L"not found " + data_dir;
		return this->CreateErrorResponse(request, kErrorIOStr, message);
	}

	try {
		auto work_dir = this->GetSmsWorkDirectory();
		manager::SmsMasterDatabase master_db(data_dir, work_dir);
		Json response = Json::object{ {"constructionId", 1} };
		return Json::object{ {"request", request}, {"response", response} };
	} catch (SmsDatabaseException &ex) {
		return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
	} catch (SmsException &ex) {
		return this->CreateErrorResponse(request, kErrorInvalidCommandStr, ex.What());
	} catch (fs::filesystem_error) {
		const string message = "Import construction fail";
		return this->CreateErrorResponse(request, kErrorInternalStr, message);
	}
}

}  // namespace sms_accessor

