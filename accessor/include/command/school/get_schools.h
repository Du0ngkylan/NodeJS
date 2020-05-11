/**
 * @file get_schools.h
 * @brief get schools command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOLS_H_
#define ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOLS_H_

#include "../../accessor_command.h"

namespace accessor {

/**
 * @class GetSchools
 * @brief get constructions command
 */
class GetSchools : public AccessorCommand {
 public:
  /**
   * @fn
   * GetSchools
   * @brief constructor
   */
  GetSchools();

  /**
   * @fn
   * ~GetSchools
   * @brief destructor
   */
  ~GetSchools();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json 
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);
};

}  // namespace accessor

#endif  // ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOLS_H_
