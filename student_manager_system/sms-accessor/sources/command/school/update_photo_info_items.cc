/**
 * @file update_photo_info_items.cc
 * @brief update photo info items command implementation
 * @author le giap
 * @date 2018/07/20
 */

#include "command/construction/update_photo_info_items.h"
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include "util/goyo_app_util.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace fs = boost::filesystem;

namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoUpdatePhotoInfoItems
 * @brief constructor
 */
GoyoUpdatePhotoInfoItems::GoyoUpdatePhotoInfoItems() {}

/**
 * @fn
 * ~GoyoUpdatePhotoInfoItems
 * @brief destructor
 */
GoyoUpdatePhotoInfoItems::~GoyoUpdatePhotoInfoItems() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json
 * @param (raw) raw string
 */
Json GoyoUpdatePhotoInfoItems::ExecuteCommand(Json &request, string &raw) {
  auto data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    auto message = L"Not found " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  auto j_construction_id = request["args"]["constructionId"];
  // validate arguments
  if (j_construction_id.is_null() || !j_construction_id.is_number()) {
    string message = "'args.constructionId' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  auto j_photo_info_item_tree = request["args"]["photoInfoItemTree"];
  if (j_photo_info_item_tree.is_null()) {
    string message = "'args.photoInfoItemTree' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }

  auto construction_id = j_construction_id.int_value();
  try {
    auto work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_db(data_dir, work_dir);
    auto &construction_db = master_db.GetConstructionDatabase(construction_id);
    model::GoyoConstructionPhotoInfo construction_photo_info;
    auto is_root = true;
    CreateConstructionPhotoInfo(j_photo_info_item_tree, 
                                construction_photo_info, is_root);
    construction_db.UpdatePhotoInfoItems(construction_photo_info);
    Json response = Json::object{{"updateCount", 1}};
    return Json::object{{"request", request}, {"response", response}};
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  }
}

/**
 * @fn
 * CreateConstructionPhotoInfo
 * @brief execute command
 * @param (photo_info_item) photo_info_item
 * @param (out_photo_info_item) out_photo_info_item
 */
void GoyoUpdatePhotoInfoItems::CreateConstructionPhotoInfo(
    Json &cons_item, model::GoyoConstructionPhotoInfo &out_cons_item,
    const bool is_root) const {


  if (!cons_item["itemId"].is_null() && cons_item["itemName"].is_string()) {
    int item_id = 0;
    if (cons_item["itemId"].is_number()) {
      item_id = cons_item["itemId"].int_value();
    } else {
      item_id = stoi(cons_item["itemId"].string_value());
    }
    out_cons_item.SetItemId(item_id);

    auto item_name = cons_item["itemName"].string_value();
    out_cons_item.SetItemName(item_name);
    out_cons_item.SetReserve(0);
    if (is_root) {
      out_cons_item.SetParentItemId(0);
      out_cons_item.SetBrotherItemId(0);
    }
    auto j_photo_child_items = cons_item["photoChildItems"];
    if (!j_photo_child_items.is_array() ||
      (j_photo_child_items.is_array() && 
                          j_photo_child_items.array_items().empty())) {
      out_cons_item.SetChildItemId(0);
      return;
    }
    auto j_child_items = j_photo_child_items.array_items();

    auto child_id = j_child_items[0]["itemId"].int_value();
    out_cons_item.SetChildItemId(child_id);

    vector<GoyoConstructionPhotoInfo> construction_photo_info_child;
    for (auto it = j_child_items.begin(); it != j_child_items.end(); ++it) {
      model::GoyoConstructionPhotoInfo photo_info_item_child;
      CreateConstructionPhotoInfo(*it, photo_info_item_child);

      auto next = it + 1;
      if (next != j_child_items.end()) {
        auto brother_id = (*next)["itemId"].int_value();
        photo_info_item_child.SetBrotherItemId(brother_id);
      } else {
        photo_info_item_child.SetBrotherItemId(0);
      }
      photo_info_item_child.SetParentItemId(item_id);
      construction_photo_info_child.emplace_back(photo_info_item_child);
    }
    out_cons_item.SetConstructionChildItems(construction_photo_info_child);
  }
}  // namespace goyo_bookrack_accessor

}  // namespace goyo_bookrack_accessor
