import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Maximize2, MoreVertical, Lightbulb } from "lucide-react";

export default function NewQuotesRelatedListPage() {
  const navigate = useNavigate();
  const [relatedListName, setRelatedListName] = useState("");
  const [visibility, setVisibility] = useState("only-me");
  const [script, setScript] = useState(`/* This is a sample function. It will display the quote details. */
headerData = List();
headerData.add({"label":"Quote Number"});
headerData.add({"label":"Customer Name"});
headerData.add({"label":"Status"});
headerData.add({"label":"Amount","align":"right"});
details = Map();
details.put("quote_number",{"value":quote.get("number"),"isExternal":true,"link":"https://books.zoho.com/app#/quotes/" + quote.get("quote_id")});
details.put("customer_name",{"value":quote.get("customer_name"),"isExternal":true,"link":"https://books.zoho.com/app#/contacts/" + quote.get("customer_id")});
details.put("status",{"value":quote.get("status")});
details.put("amount",{"value":quote.get("total")});
listData = List();
listData.add(details);
resultMap = Map();
resultMap.put("header_context",headerData);
resultMap.put("data",listData);
return resultMap;`);

  const delugeComponents = [
    {
      category: "BASIC",
      items: ["set variable", "add comment", "info"]
    },
    {
      category: "CONDITION",
      items: ["if", "else if", "else"]
    },
    {
      category: "NOTIFICATIONS",
      items: ["send mail", "post to chat"]
    },
    {
      category: "INTEGRATIONS",
      items: ["webhook", "zoho integration"]
    }
  ];

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Related List - Quotes</h1>
        <button
          onClick={() => navigate("/settings/quotes")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} className="text-red-500" />
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related List Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={relatedListName}
              onChange={(e) => setRelatedListName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter related list name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can view this related list?
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="only-me"
                  checked={visibility === "only-me"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Only Me</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="everyone"
                  checked={visibility === "everyone"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Everyone</span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-yellow-500" />
              <p className="text-sm text-gray-600">
                Enter a script to fetch data from third party services and view them from within Zoho Books.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="w-64 bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="space-y-4">
                  {delugeComponents.map((category, idx) => (
                    <div key={idx}>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {category.category}
                      </div>
                      <div className="space-y-1">
                        {category.items.map((item, itemIdx) => (
                          <button
                            key={itemIdx}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Deluge by Zoho Creator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-blue-600 hover:text-blue-700">View Deluge Components Usage</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-xs text-blue-600 hover:text-blue-700">Connections</button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Maximize2 size={14} className="text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <MoreVertical size={14} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                  <code className="text-sm text-gray-900 font-mono">
                    Map My_Related_List( Map quote, Map organization, Map user, Map page context ) {'{'}
                  </code>
                </div>

                <div className="bg-white">
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-3 font-mono text-sm text-gray-900 focus:outline-none resize-none"
                    style={{ fontFamily: 'monospace', lineHeight: '1.5' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate("/settings/quotes")}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => navigate("/settings/quotes")}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}



