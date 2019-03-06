/**
 * @file update_school.h
 * @brief update school order command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsUpdateSchool
 * @brief update school order command
 */
class SmsUpdateSchool : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsUpdateSchool
   * @brief constructor
   */
  SmsUpdateSchool();

  /**
   * @fn
   * ~SmsUpdateSchool
   * @brief destructor
   */
  ~SmsUpdateSchool();

	/**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param request request json
   * @param raw raw string
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);

 private:
  /**
   * @fn
   * GetSchoolInfo
   * @brief Get info of school form json
   * @param info model of school
   * @param school json data input
   */
	 void GetSchoolInfo(db_manager::model::SmsSchoolInfo &info,
                      const json11::Json &school);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_H_