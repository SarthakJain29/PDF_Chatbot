"""Generates public/renewable-energy-briefing.pdf (a short original briefing used for the 'Try a sample' button)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

pages = [
 ("Solar Power Basics", [
  "Photovoltaic (PV) cells convert sunlight directly into electricity using semiconductor materials, most commonly silicon. When photons strike the cell they knock electrons loose, creating a flow of current.",
  "Typical commercial solar panels convert between 18 and 23 percent of incoming sunlight into electricity. Laboratory multi-junction cells have exceeded 47 percent under concentrated light, but they are too costly for rooftops.",
  "A residential system of 6 kilowatts usually produces around 8,000 kilowatt-hours per year in a sunny climate, enough to cover the annual demand of an average household."]),
 ("Wind Energy and Storage", [
  "Modern onshore wind turbines have rotor diameters above 120 metres and capacity factors between 30 and 45 percent. Offshore turbines reach higher capacity factors because winds are stronger and steadier at sea.",
  "Because solar and wind output varies, storage matters. Lithium-ion batteries dominate short-duration storage of up to four hours, while pumped hydro remains the largest source of long-duration storage worldwide.",
  "Battery pack prices fell by roughly 90 percent between 2010 and 2023, which is a major reason grid-scale batteries are now routinely paired with new solar farms."]),
 ("Costs and Outlook", [
  "The levelised cost of electricity from utility-scale solar fell by about 85 percent over the last decade, making it cheaper than new coal or gas generation in most regions.",
  "The main barriers to faster growth are grid connection queues, permitting delays and the need for more transmission lines, rather than the cost of the technology itself.",
  "Analysts expect solar to become the largest single source of new generating capacity worldwide, with wind and storage following closely."]),
]
st = getSampleStyleSheet()
doc = SimpleDocTemplate("public/renewable-energy-briefing.pdf", pagesize=A4, title="Renewable Energy Briefing")
flow = []
for i, (h, ps) in enumerate(pages):
    flow.append(Paragraph(h, st["Heading1"]))
    for p in ps:
        flow += [Paragraph(p, st["BodyText"]), Spacer(1, 12)]
    if i < len(pages) - 1: flow.append(PageBreak())
doc.build(flow)
