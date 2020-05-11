/**
 * @file get_schools.cc
 * @brief get schools command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/get_schools.h"
#include <windows.h>
#include "util/sms_app_util.h"

using namespace std;
using namespace json11;

namespace accessor {

/**
 * @fn
 * GetSchools
 * @brief constructor
 */
GetSchools::GetSchools() {}

/**
 * @fn
 * ~GetSchools
 * @brief destructor
 */
GetSchools::~GetSchools() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json 
 * @param (raw) raw string
 */
Json GetSchools::ExecuteCommand(Json &request, string &raw) {

    Json::object schools = Json::object{
                              { "schoolId", 1},
                              { "schoolName", "HUS"},
                              { "schoolNumber", 2020},
                              { "address", "HaNoi" }
    };

  try {
    Json response = Json::object{ { "schools", schools }};
    return Json::object{{ "request", request }, { "response", response }};
  } catch (...) {
      return this->CreateErrorResponse(request, kErrorInternalStr, "Error");
  }
}

}  // namespace accessor
