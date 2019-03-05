/**
 * @file update_construction_order.h
 * @brief update construction order command header
 * @author le giap
 * @date 2018/03/26
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_UPDATE_CONSTRUCTION_ORDER_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_UPDATE_CONSTRUCTION_ORDER_H_

#include "../../accessor_command.h"
#include <goyo_db/model/goyo_construction_info.h>


namespace goyo_bookrack_accessor {

/**
 * @class GoyoUpdateConstructionOrder
 * @brief update construction order command
 */
class GoyoUpdateConstructionOrder : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoUpdateConstructionOrder
   * @brief constructor
   */
  GoyoUpdateConstructionOrder();

  /**
   * @fn
   * ~GoyoUpdateConstructionOrder
   * @brief destructor
   */
  ~GoyoUpdateConstructionOrder();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param request request json
   * @param raw raw string
   */
  json11::Json ExecuteCommand(json11::Json& request, std::string& raw);

 private:
  void GetConstructionInfo(goyo_db_manager::model::GoyoConstructionInfo &info,
                           const json11::Json &construction);

  int UpdateConstruction(const json11::Json &construction);


  std::wstring m_data_dir;
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_UPDATE_CONSTRUCTION_ORDER_H_
