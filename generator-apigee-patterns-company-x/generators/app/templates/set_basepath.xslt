<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xsl:stylesheet version="1.0"
 xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
 <xsl:template match="/">
    <xsl:copy>
          <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
 </xsl:template>
 <xsl:template match="BasePath">
    <BasePath>the_base_path</BasePath>
 </xsl:template>
</xsl:stylesheet>
		   