/**
 * @file get_constructions.h
 * @brief get constructions command header
 * @author duong.maixuan
 * @date 2018/07/15
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_GET_CONSTRUCTIONS_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_GET_CONSTRUCTIONS_H_

#include "../../accessor_command.h"
#include "goyo_db_if.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoGetConstructions
 * @brief get constructions command
 */
class GoyoGetConstructions : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoGetConstructions
   * @brief constructor
   */
  GoyoGetConstructions();

  /**
   * @fn
   * ~GoyoGetConstructions
   * @brief destructor
   */
  ~GoyoGetConstructions();

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
  * CreateConstruction
  * @param (info) goyo contruction info
  * @param (db) contruction database
  * @brief create construction
  * @return construction object
  */
  json11::Json CreateConstruction(
      goyo_db_manager::model::GoyoConstructionInfo &info,
      goyo_db_manager::GoyoDatabase &db);

  /**
   * @fn
   * CreateKnack
   * @param (knack_info) knack info
   * @brief create knack
   * @return nack object
   */
  json11::Json CreateKnack(goyo_db_manager::model::GoyoKnackInfo &knack_info,
    goyo_db_manager::GoyoDatabase &db);
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_GET_CONSTRUCTIONS_H_
