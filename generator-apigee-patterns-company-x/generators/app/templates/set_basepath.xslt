<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
 xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
 <xsl:template match="/">
    <BasePath>the_base_path</BasePath>
 </xsl:template>
 <xsl:template match="/" name="identity">
   <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
   </xsl:copy>
 </xsl:template>
</xsl:stylesheet>