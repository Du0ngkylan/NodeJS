/**
 * @file get_photo_info_tree.cc
 * @brief get photo info tree command implementation
 * @author toan nguyen
 * @date 2018/07/23
 */

#include "command/construction/get_photo_info_tree.h"
#include "util/goyo_app_util.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoGetPhotoInfoTree
 * @brief constructor
 */
GoyoGetPhotoInfoTree::GoyoGetPhotoInfoTree() {}

/**
 * @fn
 * ~GoyoGetPhotoInfoTree
 * @brief destructor
 */
GoyoGetPhotoInfoTree::~GoyoGetPhotoInfoTree() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 * @return result json
 */
Json GoyoGetPhotoInfoTree::ExecuteCommand(Json &request, string &raw) {
  auto data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    auto message = L"Not found " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  auto j_construction_id = request["args"]["constructionId"];
  if (j_construction_id.is_null() || !j_construction_id.is_number()) {
    string message = "'args.constructionId' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  auto construction_id = j_construction_id.int_value();

  auto j_item_id = request["args"]["itemId"];
  if (j_item_id.is_null() || !j_item_id.is_number()) {
    string message = "'args.itemId' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  auto item_id = j_item_id.int_value();

  try {
    auto work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_db(data_dir, work_dir);
    auto &construction_db = master_db.GetConstructionDatabase(construction_id);
    auto &photo_info = construction_db.GetConstructionPhotoInfoTree(item_id);
    auto response = GetPhotoInfo(photo_info);
    return Json::object{{"request", request}, {"response", response}};
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  }
}

/**
 * @fn
 * GetPhotoInfo
 * @brief get photo info
 * @param construction_photo_info construction photo info
 * @return result json
 */
Json GoyoGetPhotoInfoTree::GetPhotoInfo(
    model::GoyoConstructionPhotoInfo &construction_photo_info) const {
  auto root_item = Json::object();
  // create construction photo info object
  root_item = Json::object{
      {"itemId", construction_photo_info.GetItemId()},
      {"childItemId", construction_photo_info.GetChildItemId()},
      {"brotherItemId", construction_photo_info.GetBrotherItemId()},
      {"parentItemId", construction_photo_info.GetParentItemId()},
      {"itemName", construction_photo_info.GetItemName()},
      {"reserve", construction_photo_info.GetReserve()}};

  auto photo_child_items = construction_photo_info.GetConstructionChildItems();
  auto result = Json::array();
  for (auto &child_item : photo_child_items) {
    auto photo_item = GetPhotoInfo(child_item);
    result.push_back(photo_item);
  }
  root_item.insert(pair<string, Json>("photoChildItems", result));
  return root_item;
}

}  // namespace goyo_bookrack_accessor
