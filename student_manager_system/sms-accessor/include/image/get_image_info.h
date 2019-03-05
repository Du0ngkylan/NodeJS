/**
 * @file get_image_info.h
 * @brief get image information command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_IMAGE_GET_IMAGE_INFO_H
#define SMS_ACCESSOR_INCLUDE_COMMAND_IMAGE_GET_IMAGE_INFO_H

#include "../accessor_command.h"

namespace sms_accessor {

/**
 * @class SmsGetImageInfo
 * @brief Get Image Information command
 */
class SmsGetImageInfo : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsGetImageInfo
   * @brief constructor
   */
  SmsGetImageInfo();

  /**
   * @fn
   * ~SmsGetImageInfo
   * @brief destructor
   */
  ~SmsGetImageInfo();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json& request, std::string& raw);

  /**
   * @fn
   * Validator
   * @param (request) request json
   * @return bool result
   */
  bool validateRequestParam(json11::Json& request);

  /**
   * @fn
   * UTF-8 to Shift-jis converter. 
   * @param (string) UTF-8 string
   * @return std::string shift-jis string
   */
  std::string SmsGetImageInfo::UTF8toSjis(std::string srcUTF8);

 private:
  // store error type
  std::string m_error_type;

  // error message
  std::string errorMessage;
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_IMAGE_GET_IMAGE_INFO_H