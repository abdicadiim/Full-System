 = 'Frontend/Billing/src/pages/Expense/expenses/RecordExpense.tsx'
 = Get-Content -Raw -Encoding UTF8 
 = '</button>\r\n                    </div>\r\n                  </div>'
 = '</button>\r\n                    </div>\r\n                    {formData.customer_id && (\r\n                      <div class= flex items-center gap-3 mt-2>\r\n                        <div class=text-sm text-gray-600>\r\n                          <span class=font-semibold text-gray-800>Project:</span>\r\n                          <span class=text-gray-700>\r\n                            {formData.projectName || (customerProjects.length ? Select a project below : No project selected)}\r\n                          </span>\r\n                        </div>\r\n                        <label class=inline-flex items-center gap-1 text-sm text-gray-600>\r\n                          <input type=checkbox class=h-4 w-4 border-gray-300 checked={Boolean(formData.billable)} readOnly />\r\n                          <span>{Boolean(formData.billable) ? Billable : Not Billable}</span>\r\n                        </label>\r\n                      </div>\r\n                    )}\r\n                  </div>'
if ( -notlike **) { throw 'needle missing' }
 =  -replace [regex]::Escape(), 
Set-Content -Encoding UTF8 -LiteralPath  
