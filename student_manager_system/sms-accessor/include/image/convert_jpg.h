/**
 * @file convert_jpg.h
 * @brief convert to command header
 * @author kanegon
 * @date 2018/06/11
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_CONVERT_JPG_H
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_CONVERT_JPG_H

#include "../accessor_command.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoConvertJpg
 * @brief Convert to JPG command
 */
class GoyoConvertJpg : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoConvertJpg
   * @brief constructor
   */
  GoyoConvertJpg();

  /**
   * @fn
   * ~GoyoConvertJpg
   * @brief destructor
   */
  ~GoyoConvertJpg();

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
  std::string GoyoConvertJpg::UTF8toSjis(std::string srcUTF8);

 private:
  // store error type
  std::string m_error_type;

  // error message
  std::string errorMessage;
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_CONVERT_JPG_H