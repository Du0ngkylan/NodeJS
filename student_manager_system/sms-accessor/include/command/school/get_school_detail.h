/**
 * @file get_school_detail.h
 * @brief get school detail command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOL_DETAIL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOL_DETAIL_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsGetSchoolDetail
 * @brief get school detail command
 */
class SmsGetSchoolDetail : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsGetSchoolDetail
   * @brief constructor
   */
  SmsGetSchoolDetail();

  /**
   * @fn
   * ~SmsGetSchoolDetail
   * @brief destructor
   */
  ~SmsGetSchoolDetail();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json 
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);

 private:
  /**
   * @fn
   * CreateSchool
   * @param (info) school info
   * @brief create school detail
   * @return school object
   */
   json11::Json CreateSchool(db_manager::model::SmsSchoolInfo &info);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOL_DETAIL_H_
